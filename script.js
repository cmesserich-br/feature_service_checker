let sampleFeatures = [];

// Fetch metadata from a layer/service
async function fetchFeatureLayerMetadata(url) {
  const response = await fetch(`${url}?f=json`);
  if (!response.ok) throw new Error('Failed to fetch metadata');
  return response.json();
}

// Fetch up to N sample features
async function fetchSampleFeatures(url, outFields = ['*'], maxSamples = 10) {
  const response = await fetch(`${url}/query?where=1%3D1&outFields=${outFields.join(',')}&resultRecordCount=${maxSamples}&f=json`);
  if (!response.ok) throw new Error('Failed to fetch sample features');
  const json = await response.json();
  return json.features || [];
}

// Build the main logic when Inspect is clicked
async function inspectService() {
  const input = document.getElementById('service-url');
  const baseUrl = input.value.trim();
  if (!baseUrl) return;

  try {
    const metadata = await fetchFeatureLayerMetadata(baseUrl);
    const layers = metadata.layers || [];

    const layerSelector = document.getElementById('layer-selector');
    layerSelector.innerHTML = '';

    if (layers.length > 1) {
      const select = document.createElement('select');
      select.className = 'layer-select';

      layers.forEach(layer => {
        const option = document.createElement('option');
        option.value = `${baseUrl}/${layer.id}`;
        option.textContent = `${layer.name} (ID: ${layer.id})`;
        select.appendChild(option);
      });

      select.onchange = async () => {
        await loadFeatureService(select.value);
        await handleSampleViewer(select.value);
      };

      layerSelector.appendChild(select);
      await loadFeatureService(`${baseUrl}/${layers[0].id}`);
      await handleSampleViewer(`${baseUrl}/${layers[0].id}`);
    } else {
      const fullUrl = layers.length === 1 ? `${baseUrl}/${layers[0].id}` : baseUrl;
      layerSelector.textContent = '';
      await loadFeatureService(fullUrl);
      await handleSampleViewer(fullUrl);
    }

  } catch (err) {
    console.error('Error loading feature service:', err);
  }
}

// Load metadata into the DOM + build schema table
async function loadFeatureService(layerUrl) {
  const json = await fetchFeatureLayerMetadata(layerUrl);

  document.getElementById('layer-name').textContent = json.name || '—';
  document.getElementById('layer-owner').textContent = json.documentInfo?.author || json.copyrightText || '—';
  document.getElementById('layer-updated').textContent = json.editFieldsInfo?.lastEditDate
    ? new Date(json.editFieldsInfo.lastEditDate).toLocaleString()
    : '—';
  document.getElementById('layer-description').textContent = json.description || '—';

  const fieldsTable = document.getElementById('fields-table');
  fieldsTable.innerHTML = '';

  if (json.fields?.length) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Field', 'Alias', 'Type'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    fieldsTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    json.fields.forEach(field => {
      const row = document.createElement('tr');
      [field.name, field.alias || '', field.type].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    fieldsTable.appendChild(tbody);

    // Handle schema CSV export
    document.getElementById('download-schema').onclick = () => {
      const csv = [
        ['Field', 'Alias', 'Type'],
        ...json.fields.map(f => [f.name, f.alias || '', f.type])
      ].map(r => r.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'schema.csv';
      link.click();
      URL.revokeObjectURL(url);
    };
  }
}

// Display sample features in a table
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

// CSV export for sample features
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

// Load and show sample records
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

// 🔗 Connect Inspect button
document.getElementById('inspect-btn').addEventListener('click', inspectService);
