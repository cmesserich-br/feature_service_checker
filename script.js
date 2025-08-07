
async function loadLayer() {
  const url = document.getElementById('urlInput').value.trim();
  const layerUrl = url.match(/FeatureServer\/\d+$/) ? url : url.replace(/FeatureServer$/, 'FeatureServer/0');
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

    basicInfoDiv.innerHTML = `
      <p><strong>Name:</strong> ${metadata.name}</p>
      <p><strong>Description:</strong> ${metadata.description || 'N/A'}</p>
      <p><strong>Feature Count:</strong> ${countData.count}</p>
      <p><strong>Geometry Type:</strong> ${metadata.geometryType}</p>
    `;

    schemaDiv.innerHTML = '<table><thead><tr><th>Field</th><th>Alias</th><th>Type</th></tr></thead><tbody>' +
      metadata.fields.map(f => `<tr><td>${f.name}</td><td>${f.alias}</td><td>${f.type}</td></tr>`).join('') +
      '</tbody></table>';

    recordsDiv.innerHTML = '<pre>' + JSON.stringify(sampleData.features.map(f => f.attributes), null, 2) + '</pre>';

    output.classList.remove('hidden');
  } catch (error) {
    alert('Failed to fetch or parse layer. Check the URL and try again.');
    console.error(error);
  }
}
