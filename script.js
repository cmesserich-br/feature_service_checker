document.getElementById("inspectBtn").addEventListener("click", () => {
  const url = document.getElementById("serviceUrl").value.trim();
  if (!url.endsWith("FeatureServer")) {
    alert("Please enter a FeatureService URL ending in /FeatureServer");
    return;
  }

  fetch(`${url}?f=json`)
    .then((res) => res.json())
    .then((data) => {
      const layers = data.layers || [];
      const selector = document.getElementById("layerSelector");
      const container = document.getElementById("layerSelectorContainer");
      selector.innerHTML = "";

      if (layers.length === 0) {
        container.style.display = "none";
        inspectLayer(url); // try entire URL
        return;
      }

      layers.forEach((layer) => {
        const option = document.createElement("option");
        option.value = `${url}/${layer.id}`;
        option.textContent = `${layer.name} (ID: ${layer.id})`;
        selector.appendChild(option);
      });

      container.style.display = "block";
      selector.addEventListener("change", () => inspectLayer(selector.value));
      inspectLayer(`${url}/${layers[0].id}`); // auto-load first layer
    })
    .catch((err) => {
      alert("Error fetching service info.");
      console.error(err);
    });
});

function inspectLayer(layerUrl) {
  fetch(`${layerUrl}?f=json`)
    .then((res) => res.json())
    .then((layer) => {
      document.getElementById("infoSection").style.display = "block";
      document.getElementById("layerName").textContent = layer.name || "—";
      document.getElementById("layerDescription").textContent = layer.description || "—";
      document.getElementById("layerOwner").textContent = layer.copyrightText || "—";

      const lastEdit = layer.editingInfo?.lastEditDate || layer.lastEditDate;
      document.getElementById("lastModified").textContent = lastEdit
        ? new Date(lastEdit).toLocaleString()
        : "—";

      document.getElementById("featureCount").textContent =
        layer.estimatedFeatureCount ?? layer.maxRecordCount ?? "—";

      document.getElementById("geometryType").textContent =
        layer.geometryType || "—";

      // Schema
      const tableBody = document.querySelector("#schemaTable tbody");
      tableBody.innerHTML = "";
      (layer.fields || []).forEach((field) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${field.name}</td>
          <td>${field.alias}</td>
          <td>${field.type}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      alert("Error fetching layer info.");
      console.error(err);
    });
}
