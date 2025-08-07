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

  if (!features.length) {
    sampleContainer.textContent = 'No sample records found.';
    return;
  }

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
      td.textContent = feature.attributes[header];
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn';
  downloadBtn.textContent = 'Download Records CSV';
  downloadBtn.onclick = () => downloadCSV(features);

  sampleContainer.appendChild(downloadBtn);
  sampleContainer.appendChild(table);
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
  } catch (error) {
    console.error('Sample Viewer Error:', error);
    const sampleContainer = document.getElementById('sample-section');
    sampleContainer.textContent = 'Unable to load sample records.';
  }
}

// Example usage (insert this inside your existing layer selection or inspect logic):
// await handleSampleViewer(fullLayerUrl);
