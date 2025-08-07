
let map;
let footprintLayer;

async function inspectLayer() {
  const url = document.getElementById('serviceUrl').value.trim();
  if (!url) return alert('Please enter a Feature Layer or Service URL');

  let layerUrl = url;
  const serviceInfo = await fetch(`${url}?f=json`).then(r => r.json());
  if (serviceInfo.layers && serviceInfo.layers.length > 0) {
    layerUrl = `${url.replace(/\/?$/, '')}/${serviceInfo.layers[0].id}`;
  }

  const layerInfo = await fetch(`${layerUrl}?f=json`).then(r => r.json());

  document.getElementById('layerName').textContent = layerInfo.name || '—';
  document.getElementById('layerDescription').textContent = layerInfo.description || '—';
  document.getElementById('layerOwner').textContent = layerInfo.owner || '—';
  document.getElementById('lastModified').textContent = serviceInfo.modified ? new Date(serviceInfo.modified).toLocaleString() : '—';
  document.getElementById('numViews').textContent = serviceInfo.numViews || '—';
  document.getElementById('geometryType').textContent = layerInfo.geometryType || '—';

  const fields = layerInfo.fields || [];
  const schemaBody = document.querySelector('#schemaTable tbody');
  schemaBody.innerHTML = '';
  fields.forEach(f => {
    const row = `<tr><td>${f.name}</td><td>${f.alias || ''}</td><td>${f.type}</td></tr>`;
    schemaBody.insertAdjacentHTML('beforeend', row);
  });

  const sampleResp = await fetch(`${layerUrl}/query?where=1=1&outFields=*&f=json&resultRecordCount=5`).then(r => r.json());
  const features = sampleResp.features || [];
  document.getElementById('featureCount').textContent = sampleResp.exceededTransferLimit ? '1000+' : features.length;
  document.getElementById('sampleRecords').textContent = JSON.stringify(features.map(f => f.attributes), null, 2);

  if (layerInfo.extent && layerInfo.extent.spatialReference.wkid === 4326) {
    drawFootprint(layerInfo.extent);
  } else {
    document.getElementById('mapSection').classList.add('hidden');
  }

  document.getElementById('results').classList.remove('hidden');
}

function drawFootprint(extent) {
  const bounds = L.latLngBounds(
    [extent.ymin, extent.xmin],
    [extent.ymax, extent.xmax]
  );

  if (!map) {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  }

  if (footprintLayer) {
    footprintLayer.setBounds(bounds);
  } else {
    footprintLayer = L.rectangle(bounds, { color: '#007aff', weight: 2 }).addTo(map);
  }

  map.fitBounds(bounds);
  document.getElementById('mapSection').classList.remove('hidden');
}

document.getElementById('inspectBtn').addEventListener('click', inspectLayer);
