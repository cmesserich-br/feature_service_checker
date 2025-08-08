let sampleFeatures = [];

async function fetchFeatureLayerMetadata(url) {
  const response = await fetch(`${url}?f=json`);
  if (!response.ok) throw new Error('Failed to fetch metadata');
  return response.json();
}

async function fetchSampleFeatures(url, outFields = ['*'], maxSamples = 10) {
  const response = await fetch(`${url}/query?where=1%3D1&outFields=${outFields.join(',')}&resultRecordCount=${maxSamples}&f=json`);
  if (!response.ok) throw new Error('Failed to fetch sample features');
  const json = await response.json();
  return json.features || [];
}

function displaySampleTable(features) {
  const sampleContainer = document.getElementById('sample-section');
  sampleContainer.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'header-with-button';
  const title = document.createElement('h2');
  title.textContent = 'Sample Records';
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn';
  downloadBtn.textContent = 'Download Records CSV';
  downloadBtn.onclick = () => downloadCSV(features);
  header.appendChild(title);
  header.appendChild(downloadBtn);
  sampleContainer.appendChild(header);

  if (!features.length) {
    const message = document.createElement('p');
    message.textContent = 'No sample records found.';
    sampleContainer.appendChild(message);
    return;
  }

  const tableContainer = document.createElement('div');
  tableContainer.className = 'scrollable-table';

  const table = document.createElement('table');
  table.className = 'info-table';

  const thead = document.createElement('thead');
  const headers = Object.keys(features[0].attributes);
  const headerRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  features.forEach((feature) => {
    const row = document.createElement('tr');
    headers.forEach((header) => {
      const td = document.createElement('td');
      const cellValue = feature.attributes[header];
      td.textContent = cellValue;
      td.title = cellValue ?? '';
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  sampleContainer.appendChild(tableContainer);
}

function updateMapPreview(serviceUrl) {
  const mapFrame = document.getElementById('map-preview');
  const viewerUrl = `https://www.arcgis.com/apps/mapviewer/index.html?url=${encodeURIComponent(serviceUrl)}&source=sd`;
  mapFrame.src = viewerUrl;
  document.getElementById('map-preview-section').style.display = 'block';
}

function downloadCSV(features) {
  if (!features.length) return;
  const headers = Object.keys(features[0].attributes);
  const rows = features.map((f) => headers.map((h) => JSON.stringify(f.attributes[h] || '')).join(','));
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample_records.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function handleSampleViewer(layerUrl) {
  try {
    const samples = await fetchSampleFeatures(layerUrl);
    sampleFeatures = samples;
    displaySampleTable(samples);

    // ✅ Only show if data exists
    if (samples.length) {
      document.getElementById('sample-section').style.display = 'block';
    } else {
      document.getElementById('sample-section').style.display = 'none';
    }
  } catch (error) {
    console.error('Sample Viewer Error:', error);
    const sampleContainer = document.getElementById('sample-section');
    sampleContainer.textContent = 'Unable to load sample records.';
    document.getElementById('sample-section').style.display = 'block';
  }
}

async function inspectService(url) {
  try {
    // 🔒 Hide all content sections initially
    document.getElementById('layer-info').style.display = 'none';
    document.getElementById('fields-info').style.display = 'none';
    document.getElementById('sample-section').style.display = 'none';
    document.getElementById('map-preview-section').style.display = 'none';
    document.getElementById('layer-selector').innerHTML = '';

    const json = await fetchFeatureLayerMetadata(url);

    if (json.type === "Feature Layer" || json.type === "Table") {
      displayLayerInfo(json);
      displayFields(json.fields || []);
      handleSampleViewer(url);
      updateMapPreview(url);

      document.getElementById('layer-info').style.display = 'block';
      document.getElementById('fields-info').style.display = 'block';
    }
    else if (json.layers && json.layers.length > 0) {
      const instruction = document.createElement('p');
      instruction.textContent = 'Select a layer to inspect:';
      document.getElementById('layer-selector').appendChild(instruction);

      const pillContainer = document.createElement('div');
      pillContainer.className = 'pill-container';

      json.layers.forEach((layer) => {
        const pill = document.createElement('button');
        pill.className = 'layer-pill';
        pill.textContent = `${layer.name} (ID: ${layer.id})`;
        pill.onclick = async () => {
          const selectedUrl = `${url}/${layer.id}`;
          const layerJson = await fetchFeatureLayerMetadata(selectedUrl);
          displayLayerInfo(layerJson);
          displayFields(layerJson.fields || []);
          handleSampleViewer(selectedUrl);
          updateMapPreview(selectedUrl);

          document.getElementById('layer-info').style.display = 'block';
          document.getElementById('fields-info').style.display = 'block';
        };
        pillContainer.appendChild(pill);
      });

      document.getElementById('layer-selector').appendChild(pillContainer);
    } else {
      alert('No feature layers found at this URL.');
    }
  } catch (error) {
    console.error('Inspection Error:', error);
    alert('Failed to inspect the service. Check the URL and try again.');
  }
}

function displayLayerInfo(json) {
  document.getElementById('layer-name').textContent = json.name || 'Unnamed Layer';
  document.getElementById('layer-owner').textContent = json.owner || json.serviceItemOwner || 'Unknown owner';

  const lastModified = json.modified || (json.editingInfo && json.editingInfo.lastEditDate);
  document.getElementById('layer-updated').textContent = lastModified
    ? new Date(lastModified).toLocaleString()
    : 'Unknown date';

  const descElem = document.getElementById('layer-description');
  if (json.description) {
    descElem.innerHTML = json.description;
  } else {
    descElem.innerHTML = '<em>No description available.</em>';
  }
}

function displayFields(fields) {
  const table = document.getElementById('fields-table');
  table.innerHTML = '';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Field', 'Alias', 'Type'].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  fields.forEach(field => {
    const row = document.createElement('tr');

    const fieldName = document.createElement('td');
    fieldName.textContent = field.name;

    const fieldAlias = document.createElement('td');
    fieldAlias.textContent = field.alias || field.name;

    const fieldType = document.createElement('td');
    fieldType.textContent = field.type;

    row.appendChild(fieldName);
    row.appendChild(fieldAlias);
    row.appendChild(fieldType);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}


document.getElementById('inspect-btn').addEventListener('click', () => {
  const url = document.getElementById('service-url').value.trim();
  if (!url) {
    alert('Please enter a valid service URL.');
    return;
  }
  inspectService(url);
});

document.getElementById('download-schema').addEventListener('click', () => {
  const table = document.getElementById('fields-table');
  let csv = '';
  const rows = Array.from(table.querySelectorAll('tr'));
  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll('th, td')).map(td => `"${td.textContent}"`);
    csv += cols.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'schema.csv';
  link.click();
  URL.revokeObjectURL(url);
});
