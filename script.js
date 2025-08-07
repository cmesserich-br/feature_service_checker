document.getElementById("inspectBtn").addEventListener("click", async () => {
  const serviceUrl = document.getElementById("urlInput").value.trim();
  if (!serviceUrl.endsWith("FeatureServer")) {
    alert("Please enter a valid ArcGIS FeatureServer URL.");
    return;
  }

  try {
    const serviceResponse = await fetch(`${serviceUrl}?f=json`);
    const serviceData = await serviceResponse.json();

    if (!serviceData.layers || serviceData.layers.length === 0) {
      alert("No layers found in this Feature Service.");
      return;
    }

    // Populate layer selector
    const selector = document.getElementById("layerSelector");
    selector.innerHTML = "";
    serviceData.layers.forEach(layer => {
      const option = document.createElement("option");
      option.value = layer.id;
      option.textContent = `${layer.name} (ID: ${layer.id})`;
      selector.appendChild(option);
    });

    document.getElementById("layerSelectorContainer").style.display = "block";
    selector.onchange = () => fetchLayerDetails(serviceUrl, selector.value);
    fetchLayerDetails(serviceUrl, selector.value);
  } catch (error) {
    alert("Failed to fetch service info.");
    console.error(error);
  }
});

async function fetchLayerDetails(baseUrl, layerId) {
  const layerUrl = `${baseUrl}/${layerId}?f=json`;
  const response = await fetch(layerUrl);
  const data = await response.json();

  const info = document.getElementById("layerInfo");
  info.innerHTML = `
    <h2>Layer Summary</h2>
    <p><strong>Name:</strong> ${data.name || "—"}</p>
    <p><strong>Description:</strong> ${data.description || "—"}</p>
    <p><strong>Owner:</strong> ${data.copyrightText || "—"}</p>
    <p><strong>Last Modified:</strong> ${data.editingInfo?.lastEditDate ? new Date(data.editingInfo.lastEditDate).toLocaleString() : "—"}</p>
    <p><strong>Feature Count:</strong> ${data.maxRecordCount || "—"}</p>
    <p><strong>Geometry Type:</strong> ${data.geometryType || "—"}</p>
  `;

  renderSchemaTable(data.fields);
}

function renderSchemaTable(fields) {
  const container = document.getElementById("field-schema");
  if (!fields || fields.length === 0) {
    container.innerHTML = "<p>No field schema found.</p>";
    return;
  }

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "10px";

  const heading = document.createElement("h3");
  heading.textContent = "Field Schema";

  const downloadBtn = document.createElement("button");
  downloadBtn.id = "downloadSchemaCsvBtn";
  downloadBtn.textContent = "Download Schema CSV";
  downloadBtn.style.padding = "4px 8px";
  downloadBtn.style.fontSize = "14px";
  downloadBtn.addEventListener("click", downloadSchemaAsCsv);

  header.appendChild(heading);
  header.appendChild(downloadBtn);

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr><th>Field</th><th>Alias</th><th>Type</th></tr>
    </thead>
    <tbody>
      ${fields.map(f =>
        `<tr>
          <td>${f.name}</td>
          <td>${f.alias || f.name}</td>
          <td>${f.type}</td>
        </tr>`).join("")}
    </tbody>
  `;

  container.innerHTML = "";
  container.appendChild(header);
  container.appendChild(table);
}

function downloadSchemaAsCsv() {
  const table = document.querySelector("#field-schema table");
  if (!table) return;

  const rows = Array.from(table.querySelectorAll("tr")).map(row =>
    Array.from(row.querySelectorAll("th, td")).map(cell => `"${cell.innerText}"`)
  );

  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", "schema.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
