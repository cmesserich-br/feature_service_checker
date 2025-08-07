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
  const table = document.getElementById('sample-table');
  table.innerHTML = '';

  if (!features.length) {
    table.innerHTML = '<tr><td>No sample records found.</td></tr>';
    return;
  }

  const headers = Object.keys(features[0].attributes);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');
  features.forEach(feature => {
    const row = document.createElement('tr');
    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = feature.attributes[header];
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
}

function downloadCSV(features, filename = 'sample_records.csv') {
  if (!features.length) return;
  const headers = Object.keys(features[0].attributes);
  const rows = features.map(f => headers.map(h => JSON.stringify(f.attributes[h] || '')).join(','));
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleSampleViewer(layerUrl) {
  try {
    const samples = await fetchSampleFeatures(layerUrl);
    sampleFeatures = samples;
    displaySampleTable(samples);
  } catch (error) {
    console.error('Sample Viewer Error:', error);
    document.getElementById('sample-table').innerHTML = '<tr><td>Unable to load sample records.</td></tr>';
  }
}

// EVENT LISTENERS
document.getElementById('inspect-btn').addEventListener('click', async () => {
  const baseUrl = document.getElementById('service-url').value.trim();
  if (!baseUrl) return alert('Please enter a valid service URL.');

  try {
    const metadata = await fetchFeatureLayerMetadata(baseUrl);

    document.getElementById('layer-name').textContent = metadata.name || '';
    document.getElementById('layer-owner').textContent = metadata.owner || '';
    document.getElementById('layer-updated').textContent = new Date(metadata.modified).toLocaleString() || '';
    document.getElementById('layer-description').textContent = metadata.description || '';

    // Field schema table
    const schemaTable = document.getElementById('fields-table');
    schemaTable.innerHTML = '';
    const fieldHeaderRow = document.createElement('tr');
    ['Field', 'Alias', 'Type'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      fieldHeaderRow.appendChild(th);
    });
    schemaTable.appendChild(fieldHeaderRow);

    metadata.fields.forEach(field => {
      const row = document.createElement('tr');
      ['name', 'alias', 'type'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = field[key];
        row.appendChild(td);
      });
      schemaTable.appendChild(row);
    });

    // Load sample viewer
    await handleSampleViewer(baseUrl);

  } catch (err) {
    console.error('Inspect Error:', err);
    alert('Failed to inspect the service. Check the URL and try again.');
  }
});

// DOWNLOAD BUTTONS
document.getElementById('download-schema').addEventListener('click', () => {
  const schemaTable = document.getElementById('fields-table');
  const rows = Array.from(schemaTable.querySelectorAll('tr'));
  const csv = rows.map(row => 
    Array.from(row.children).map(cell => `"${cell.textContent}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'field_schema.csv';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('download-sample').addEventListener('click', () => {
  downloadCSV(sampleFeatures);
});
