
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
    // It’s a full layer URL already
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

    const sampleRes = await fetch(layerUrl + '/query?where=1=1&outFields=*&resultRecordCount=5&f=json');
    const sampleData = await sampleRes.json();

    const cleanDescription = metadata.description ? stripHTML(metadata.description) : 'N/A';

    basicInfoDiv.innerHTML = `
      <p><strong>Name:</strong> ${metadata.name}</p>
      <p><strong>Description:</strong> ${cleanDescription}</p>
      <p><strong>Feature Count:</strong> ${countData.count}</p>
      <p><strong>Geometry Type:</strong> ${metadata.geometryType}</p>
    `;

    schemaDiv.innerHTML = '<table><thead><tr><th>Field</th><th>Alias</th><th>Type</th></tr></thead><tbody>' +
      metadata.fields.map(f => `<tr><td>${f.name}</td><td>${f.alias}</td><td>${f.type}</td></tr>`).join('') +
      '</tbody></table>';

    recordsDiv.innerHTML = '<pre>' + JSON.stringify(sampleData.features.map(f => f.attributes), null, 2) + '</pre>';

    output.classList.remove('hidden');
  } catch (error) {
    alert('Failed to fetch or parse layer. Check the URL and try again.\n' + error.message);
    console.error(error);
  }
}
