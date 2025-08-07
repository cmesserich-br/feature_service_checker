document.getElementById("inspectBtn").addEventListener("click", () => {
  const url = document.getElementById("serviceUrl").value.trim();
  if (!url) return alert("Please enter a valid Feature Service URL.");
  inspectService(url);
});

document.getElementById("layerSelector").addEventListener("change", () => {
  const url = document.getElementById("serviceUrl").value.trim();
  const layerIndex = document.getElementById("layerSelector").value;
  if (layerIndex !== "") {
    loadLayerDetails(`${url}/${layerIndex}`);
  }
});

async function inspectService(url) {
  try {
    const response = await fetch(`${url}?f=json`);
    const data = await response.json();

    if (!data.hasOwnProperty("layers")) {
      loadLayerDetails(url); // single layer
      document.getElementById("layerSelectorContainer").style.display = "none";
      return;
    }

    const layerSelector = document.getElementById("layerSelector");
    layerSelector.innerHTML = "";
    data.layers.forEach(layer => {
      const option = document.createElement("option");
      option.value = layer.id;
      option.textContent = `${layer.name} (ID: ${layer.id})`;
      layerSelector.appendChild(option);
    });

    document.getElementById("layerSelectorContainer").style.display = "block";
    loadLayerDetails(`${url}/${data.layers[0].id}`);

  } catch (err) {
    console.error(err);
    alert("Failed to fetch service information.");
  }
}

async function loadLayerDetails(layerUrl) {
  try {
    const response = await fetch(`${layerUrl}?f=json`);
    const layerData = await response.json();

    const output = document.getElementById("output");
    output.innerHTML = `
      <h2>Layer Summary</h2>
      <p><strong>Name:</strong> ${layerData.name}</p>
      <p><strong>Description:</strong> ${layerData.description || "—"}</p>
      <p><strong>Owner:</strong> ${layerData.copyrightText || "—"}</p>
      <p><strong>Last Modified:</strong> ${new Date(layerData.editingInfo?.lastEditDate || layerData.currentVersion || Date.now()).toLocaleString()}</p>
      <p><strong>Feature Count:</strong> ${layerData.maxRecordCount}</p>
      <p><strong>Geometry Type:</strong> ${layerData.geometryType}</p>

      <h3>Field Schema 
        <button id="downloadSchemaBtn">Download Schema CSV</button>
      </h3>
      <table id="fieldTable">
        <thead>
          <tr>
            <th>Field</th>
            <th>Alias</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${layerData.fields.map(field => `
            <tr>
              <td>${field.name}</td>
              <td>${field.alias}</td>
              <td>${field.type}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    `;

    // CSV Download
    document.getElementById("downloadSchemaBtn").addEventListener("click", () => {
      const csv = ["Field,Alias,Type"];
      layerData.fields.forEach(field => {
        csv.push(`"${field.name}","${field.alias}","${field.type}"`);
      });
      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${layerData.name}_schema.csv`;
      link.click();
    });

  } catch (err) {
    console.error(err);
    alert("Failed to load layer details.");
  }
}
