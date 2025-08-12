// ---------- state ----------
const state = {
  token: '',
  serviceUrl: '',
  activeLayerUrl: null,
  map: null,
  mapLayer: null,
  layerExtentLatLng: null,
  samples: [],
};

// ---------- dom helpers ----------
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------- theme ----------
(function initTheme() {
  const sel = $('#themeSelect');
  const saved = localStorage.getItem('inspector-theme') || 'auto';
  sel.value = saved;
  applyTheme(saved);
  sel.addEventListener('change', () => {
    localStorage.setItem('inspector-theme', sel.value);
    applyTheme(sel.value);
  });
})();
function applyTheme(mode) {
  const html = document.documentElement;
  if (mode === 'auto') {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    html.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  } else {
    html.setAttribute('data-theme', mode);
  }
}

// ---------- map ----------
function ensureMap() {
  if (state.map) return;
  state.map = L.map('map', { preferCanvas: true, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
  state.map.setView([20, 0], 2);
  setTimeout(() => state.map.invalidateSize(), 0);
  new ResizeObserver(() => state.map.invalidateSize()).observe($('#map'));
}

function webMercatorToLatLng(x, y) {
  const R = 6378137;
  const lng = (x / R) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
  return L.latLng(lat, lng);
}
function extentToLatLngBounds(extent) {
  if (!extent) return null;
  const sr = extent.spatialReference || {};
  const wkid = sr.latestWkid || sr.wkid;
  if (wkid === 4326) return L.latLngBounds([extent.ymin, extent.xmin], [extent.ymax, extent.xmax]);
  if (wkid === 3857 || wkid === 102100 || wkid === 102113) {
    const sw = webMercatorToLatLng(extent.xmin, extent.ymin);
    const ne = webMercatorToLatLng(extent.xmax, extent.ymax);
    return L.latLngBounds(sw, ne);
  }
  return null;
}

async function refreshLayerExtent() {
  state.layerExtentLatLng = null;
  if (!state.activeLayerUrl) return;
  try {
    const meta = await getJson(state.activeLayerUrl, state.token);
    let b = extentToLatLngBounds(meta.extent || meta.fullExtent);
    if (!b && L.esri) {
      const q = L.esri.query({ url: state.activeLayerUrl, token: state.token || undefined });
      b = await new Promise((resolve) => q.bounds((err, bounds) => resolve(err ? null : bounds)));
    }
    state.layerExtentLatLng = b || null;
  } catch (e) {
    console.warn('Could not fetch layer extent:', e);
  }
}

function renderMap() {
  ensureMap();
  if (state.mapLayer) {
    try { state.map.removeLayer(state.mapLayer); } catch {}
    state.mapLayer = null;
  }
  if (!state.activeLayerUrl) {
    state.map.setView([20,0], 2);
    return;
  }

  state.mapLayer = L.esri.featureLayer({
    url: state.activeLayerUrl,
    token: state.token || undefined,
    where: '1=1',
    fields: ['*'],
    simplifyFactor: 0.5,
    precision: 7
  }).addTo(state.map);

  state.mapLayer.once('load', async () => {
    if (state.layerExtentLatLng && state.layerExtentLatLng.isValid()) {
      state.map.fitBounds(state.layerExtentLatLng, { padding: [20, 20] });
    } else {
      try {
        const b = state.mapLayer.getBounds();
        if (b && b.isValid()) state.map.fitBounds(b, { padding: [20, 20] });
      } catch {}
    }
    setTimeout(() => state.map.invalidateSize(), 0);
  });
}

async function fitMapToLayer() {
  ensureMap();
  if (!state.layerExtentLatLng) await refreshLayerExtent();
  if (state.layerExtentLatLng && state.layerExtentLatLng.isValid()) {
    state.map.fitBounds(state.layerExtentLatLng, { padding: [20, 20] });
  } else if (state.mapLayer && state.mapLayer.getBounds) {
    const b = state.mapLayer.getBounds();
    if (b && b.isValid()) state.map.fitBounds(b, { padding: [20, 20] });
  } else {
    state.map.setView([20, 0], 2);
  }
  setTimeout(() => state.map.invalidateSize(), 0);
}

// ---------- fetching ----------
async function getJson(url, token) {
  const u = new URL(url);
  u.searchParams.set('f', 'json');
  if (token) u.searchParams.set('token', token);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function queryFeatures(layerUrl, token, limit = 100) {
  const u = new URL(layerUrl.replace(/\/$/, '') + '/query');
  u.searchParams.set('where', '1=1');
  u.searchParams.set('outFields', '*');
  u.searchParams.set('returnGeometry', 'true');
  u.searchParams.set('f', 'json');
  u.searchParams.set('resultRecordCount', String(limit));
  if (token) u.searchParams.set('token', token);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---------- chips ----------
function renderLayerChips(items = []) {
  const row = $('#layersRow');
  row.innerHTML = '';
  items.forEach((it, idx) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.dataset.url = it.url;
    chip.textContent = `${it.name} (ID: ${it.id})`;
    chip.addEventListener('click', async () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      await inspectLayer(it.url);
    });
    row.appendChild(chip);

    // auto-select first if only one
    if (items.length === 1 || (state.activeLayerUrl && it.url === state.activeLayerUrl)) {
      if (idx === 0 && !state.activeLayerUrl) chip.classList.add('active');
    }
  });

  // Auto-inspect if exactly one layer
  if (items.length === 1) inspectLayer(items[0].url);
}

// ---------- ui renderers ----------
function setError(msg) {
  const bar = $('#errorBar');
  if (!msg) { bar.hidden = true; bar.textContent = ''; return; }
  bar.hidden = false; bar.textContent = msg;
}

function renderSummary(meta) {
  $('#sName').textContent = meta.name || '—';
  $('#sType').textContent = meta.geometryType || meta.type || '—';
  $('#sOwner').textContent = meta.owner || meta.serviceItemId || '—';
  const ts = meta?.editingInfo?.lastEditDate ?? meta?.lastEditDate;
  $('#sUpdated').textContent = ts ? new Date(ts).toLocaleString() : '—';
  $('#sDesc').textContent = (meta.description || '').trim() || 'No description available.';
}

function renderSchema(fields = []) {
  $('#schemaCount').textContent = `${fields.length} field(s)`;
  const body = $('#schemaTable tbody');
  body.innerHTML = '';
  fields.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.alias || '')}</td>
      <td>${escapeHtml(f.type || '')}</td>
    `;
    body.appendChild(tr);
  });
}

function renderSamples(features = []) {
  const tbl = $('#samplesTable');
  const head = tbl.querySelector('thead');
  const body = tbl.querySelector('tbody');
  head.innerHTML = ''; body.innerHTML = '';

  if (!features.length) return;

  const attrs = features[0].attributes || {};
  const columns = Object.keys(attrs);

  // header
  const trH = document.createElement('tr');
  columns.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    trH.appendChild(th);
  });
  head.appendChild(trH);

  // rows
  features.forEach(f => {
    const tr = document.createElement('tr');
    columns.forEach(c => {
      const td = document.createElement('td');
      td.textContent = formatVal(f.attributes?.[c]);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function formatVal(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function escapeHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// ---------- flow ----------
$('#inspectBtn').addEventListener('click', onInspect);
$('#fitMapBtn').addEventListener('click', fitMapToLayer);
$('#clearAllBtn').addEventListener('click', clearAll);

async function onInspect() {
  setError('');
  const url = ($('#urlInput').value || '').trim();
  state.token = ($('#tokenInput').value || '').trim();
  if (!url) { setError('Please enter a service or layer URL.'); return; }

  state.serviceUrl = url;
  $('#layersRow').innerHTML = '';
  try {
    const isService = /(FeatureServer|MapServer)\/?$/.test(url);
    if (isService) {
      const svc = await getJson(url, state.token);
      const list = [
        ...(svc.layers || []).map(l => ({ id: l.id, name: l.name, url: `${url.replace(/\/$/, '')}/${l.id}` })),
        ...(svc.tables || []).map(t => ({ id: t.id, name: t.name, url: `${url.replace(/\/$/, '')}/${t.id}` }))
      ];
      if (!list.length) {
        setError('No layers or tables found on this service.');
        clearLayerOutputs();
        return;
      }
      renderLayerChips(list);
      // if exactly one, inspectLayer will be called by renderLayerChips
      if (list.length > 1) {
        // auto-select first for convenience
        const first = $('#layersRow .chip');
        if (first) { first.classList.add('active'); await inspectLayer(list[0].url); }
      }
    } else {
      // direct layer
      renderLayerChips([{ id: '(single)', name: 'Selected Layer', url }]);
      const chip = $('#layersRow .chip');
      if (chip) chip.classList.add('active');
      await inspectLayer(url);
    }
  } catch (err) {
    console.error(err);
    setError('Failed to inspect. Check CORS, token, or URL and try again.');
  }
}

async function inspectLayer(layerUrl) {
  state.activeLayerUrl = layerUrl;

  const meta = await getJson(layerUrl, state.token);
  renderSummary(meta);
  renderSchema(meta.fields || []);

  await refreshLayerExtent();

  const result = await queryFeatures(layerUrl, state.token, 100);
  state.samples = result.features || [];
  renderSamples(state.samples);

  renderMap();
}

function clearLayerOutputs() {
  // summary
  $('#sName').textContent = '—';
  $('#sType').textContent = '—';
  $('#sOwner').textContent = '—';
  $('#sUpdated').textContent = '—';
  $('#sDesc').textContent = '—';
  // schema
  $('#schemaCount').textContent = '—';
  $('#schemaTable tbody').innerHTML = '';
  // samples
  $('#samplesTable thead').innerHTML = '';
  $('#samplesTable tbody').innerHTML = '';
}

// ---------- clear ----------
function clearAll() {
  setError('');
  $('#urlInput').value = '';
  $('#tokenInput').value = '';
  $('#layersRow').innerHTML = '';
  clearLayerOutputs();

  ensureMap();
  if (state.mapLayer) {
    try { state.map.removeLayer(state.mapLayer); } catch {}
    state.mapLayer = null;
  }
  state.map.setView([20, 0], 2);
  setTimeout(() => state.map.invalidateSize(), 0);

  state.token = '';
  state.serviceUrl = '';
  state.activeLayerUrl = null;
  state.layerExtentLatLng = null;
  state.samples = [];
}

// ---------- exports ----------
$('#exportSchemaCsv').addEventListener('click', () => {
  const rows = [['name','alias','type']];
  $$('#schemaTable tbody tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    rows.push([tds[0].textContent, tds[1].textContent, tds[2].textContent]);
  });
  downloadBlob(csv(rows), 'schema.csv', 'text/csv');
});
$('#exportSchemaJson').addEventListener('click', () => {
  const rows = [];
  $$('#schemaTable tbody tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    rows.push({ name: tds[0].textContent, alias: tds[1].textContent, type: tds[2].textContent });
  });
  downloadBlob(JSON.stringify(rows, null, 2), 'schema.json', 'application/json');
});
$('#exportSamplesCsv').addEventListener('click', () => {
  const tbl = $('#samplesTable');
  const headCells = Array.from(tbl.querySelectorAll('thead th')).map(th => th.textContent);
  const rows = [headCells];
  tbl.querySelectorAll('tbody tr').forEach(tr => {
    const cols = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
    rows.push(cols);
  });
  downloadBlob(csv(rows), 'samples.csv', 'text/csv');
});
$('#exportSamplesJson').addEventListener('click', () => {
  const tbl = $('#samplesTable');
  const headCells = Array.from(tbl.querySelectorAll('thead th')).map(th => th.textContent);
  const rows = [];
  tbl.querySelectorAll('tbody tr').forEach(tr => {
    const obj = {};
    Array.from(tr.querySelectorAll('td')).forEach((td, i) => obj[headCells[i]] = td.textContent);
    rows.push(obj);
  });
  downloadBlob(JSON.stringify(rows, null, 2), 'samples.json', 'application/json');
});

function csv(rows) {
  return rows.map(r => r.map(escapeCsv).join(',')).join('\n');
}
function escapeCsv(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadBlob(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
