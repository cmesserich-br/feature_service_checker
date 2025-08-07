
let map, extentLayer, sampleLayer;

function stripHTML(input) {
  const div = document.createElement("div");
  div.innerHTML = input;
  return div.textContent || div.innerText || "";
}

async function checkUrl() {
  const url = document.getElementById('urlInput').value.trim();
  const layerSelector = document.getElementById('layerSelector');
  const layerSelect = document.getElementById('layerSelect');
  layerSelector.classList.add('hidden');
  document.getElementById('output').classList.add('hidden');
  layerSelect.innerHTML = "";

  if (/\/FeatureServer\/?$/.test(url)) {
    try {
      const res = await fetch(url + '?f=json');
      const json = await res.json();
      if (json.layers && json.layers.length > 0) {
        json.layers.forEach(layer => {
          const option = document.createElement("option");
          option.value = layer.id;
          option.textContent = `${layer.name} (ID: ${layer.id})`;
          layerSelect.appendChild(option);
        });
        layerSelector.classList.remove('hidden');
        layerSelector.dataset.baseurl = url.replace(/\/$/, '');
      } else {
        alert("No layers found in service.");
      }
    } catch (err) {
      alert("Error fetching service JSON.");
      console.error(err);
    }
  } else if (/\/FeatureServer\/\d+$/.test(url)) {
    loadLayer(url);
  } else {
    alert("Please enter a valid ArcGIS Feature Service or Layer URL.");
  }
}

function loadSelectedLayer() {
  const selector = document.getElementById('layerSelector');
  const baseUrl = selector.dataset.baseurl;
  const selectedId = document.getElementById('layerSelect').value;
  const fullUrl = baseUrl + '/' + selectedId;
  loadLayer(fullUrl);
}

function exportToCSV(data, filename) {
  const csvRows = [];

  if (Array.isArray(data)) {
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    data.forEach(row => {
      const values = headers.map(h => JSON.stringify(row[h] ?? ""));
      csvRows.push(values.join(','));
    });
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  window.URL.revokeObjectURL(url);
}

function createFormattedJSON(data) {
  const container = document.createElement('div');
  container.className = 'json-viewer';

  const syntaxHighlight = (json) => {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?(e[+\-]?\d+)?)/g, match => {
      let cls = 'number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'key' : 'string';
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  };

  container.innerHTML = '<pre>' + syntaxHighlight(data) + '</pre>';
  return container;
}

function initMap() {
  if (!map) {
    map = L.map('map').setView([39.5, -98.5], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    extentLayer = L.layerGroup().addTo(map);
    sampleLayer = L.layerGroup().addTo(map);
  } else {
    extentLayer.clearLayers();
    sampleLayer.clearLayers();
  }
}

function showExtentView() {
  if (map) {
    sampleLayer.clearLayers();
    extentLayer.addTo(map);
  }
}

function showSampleView() {
  if (map) {
    extentLayer.clearLayers();
    sampleLayer.addTo(map);
  }
}

async function loadLayer(layerUrl) {
  const output = document.getElementById('output');
  const basicInfoDiv = document.getElementById('basicInfo');
  const schemaDiv = document.getElementById('schema');
  const recordsDiv = document.getElementById('records');
  output.classList.add('hidden');

  try {
    const metadataRes = await fetch(layerUrl + '?f=json');
    const metadata = await metadataRes.json();

    const countRes = await fetch(layerUrl + '/query?where=1=1&returnCountOnly=true&f=json');
    const countData = await countRes.json();

    const sampleRes = await fetch(layerUrl + '/query?where=1=1&outFields=*&resultRecordCount=5&returnGeometry=true&f=json');
    const sampleData = await sampleRes.json();

    const cleanDescription = metadata.description ? stripHTML(metadata.description) : 'N/A';

    basicInfoDiv.innerHTML = `
      <p><strong>Name:</strong> ${metadata.name}</p>
      <p><strong>Description:</strong> ${cleanDescription}</p>
      <p><strong>Feature Count:</strong> ${countData.count}</p>
      <p><strong>Geometry Type:</strong> ${metadata.geometryType}</p>
    `;

    const schemaRows = metadata.fields.map(f => ({
      name: f.name,
      alias: f.alias,
      type: f.type
    }));

    schemaDiv.innerHTML = `
      <table><thead><tr><th>Field</th><th>Alias</th><th>Type</th></tr></thead><tbody>
        ${schemaRows.map(f => `<tr><td>${f.name}</td><td>${f.alias}</td><td>${f.type}</td></tr>`).join('')}
      </tbody></table>
      <button onclick='exportToCSV(${JSON.stringify(schemaRows)}, "schema.csv")'>Download Schema as CSV</button>
    `;

    const records = sampleData.features.map(f => f.attributes);
    recordsDiv.innerHTML = "";
    recordsDiv.appendChild(createFormattedJSON(records));
    recordsDiv.innerHTML += `<button onclick='exportToCSV(${JSON.stringify(records)}, "sample_records.csv")'>Download Records as CSV</button>`;

    initMap();

    // Show extent as rectangle
    if (metadata.extent && metadata.extent.xmin) {
      const bounds = [
        [metadata.extent.ymin, metadata.extent.xmin],
        [metadata.extent.ymax, metadata.extent.xmax]
      ];
      const rect = L.rectangle(bounds, { color: '#007aff', weight: 2 });
      extentLayer.addLayer(rect);
      map.fitBounds(rect.getBounds());
    }

    // Show sample records with geometry
    sampleData.features.forEach(f => {
      const g = f.geometry;
      if (g && g.x && g.y) {
        L.circleMarker([g.y, g.x], { radius: 6, fillColor: '#f03', color: '#900', weight: 1, fillOpacity: 0.7 }).addTo(sampleLayer);
      }
    });

    showExtentView();
    output.classList.remove('hidden');
  } catch (error) {
    alert('Failed to fetch or parse layer. Check the URL and try again.\n' + error.message);
    console.error(error);
  }
}
