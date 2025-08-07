
document.getElementById("inspectBtn").addEventListener("click", async () => {
    const urlInput = document.getElementById("layerUrl").value.trim();
    const baseUrl = urlInput.split("/FeatureServer")[0] + "/FeatureServer";
    const infoSection = document.getElementById("infoSection");
    const layerInfoSection = document.getElementById("layerInfo");
    const layerSelect = document.getElementById("layerSelect");

    infoSection.style.display = "none";
    layerSelect.innerHTML = "";
    layerSelect.style.display = "none";
    layerInfoSection.innerHTML = "<p>Loading...</p>";

    try {
        const serviceResponse = await fetch(`${baseUrl}?f=json`);
        const serviceData = await serviceResponse.json();

        if (serviceData?.layers?.length > 0) {
            layerSelect.style.display = "block";
            serviceData.layers.forEach(layer => {
                const option = document.createElement("option");
                option.value = layer.id;
                option.textContent = `${layer.name} (ID: ${layer.id})`;
                layerSelect.appendChild(option);
            });

            layerSelect.addEventListener("change", () => {
                const selectedId = layerSelect.value;
                if (selectedId !== "") {
                    fetchLayerInfo(`${baseUrl}/${selectedId}`);
                }
            });

            // Auto-load the first layer
            fetchLayerInfo(`${baseUrl}/${serviceData.layers[0].id}`);
        } else {
            fetchLayerInfo(urlInput);
        }
    } catch (error) {
        layerInfoSection.innerHTML = `<p class="error">Failed to fetch layer info.</p>`;
        console.error(error);
    }

    infoSection.style.display = "block";
});

async function fetchLayerInfo(layerUrl) {
    const layerInfoSection = document.getElementById("layerInfo");
    const schemaTable = document.getElementById("schemaTable");

    layerInfoSection.innerHTML = "<p>Loading layer data...</p>";
    schemaTable.innerHTML = "";

    try {
        const layerResponse = await fetch(`${layerUrl}?f=json`);
        const layerData = await layerResponse.json();

        const {
            name, description, owner, editingInfo,
            lastEditDate, type, geometryType,
            fields, drawingInfo, displayField,
            capabilities, supportsPagination,
            maxRecordCount
        } = layerData;

        layerInfoSection.innerHTML = `
            <h3>Layer Info</h3>
            <p><strong>Name:</strong> ${name || "—"}</p>
            <p><strong>Description:</strong> ${description || "—"}</p>
            <p><strong>Owner:</strong> ${owner || "—"}</p>
            <p><strong>Last Modified:</strong> ${lastEditDate ? new Date(lastEditDate).toLocaleString() : "—"}</p>
            <p><strong>Feature Count:</strong> ${layerData.estimatedFeatureCount || "—"}</p>
            <p><strong>Geometry Type:</strong> ${geometryType || "—"}</p>
        `;

        schemaTable.innerHTML = `
            <tr><th>Field</th><th>Alias</th><th>Type</th></tr>
            ${fields.map(field => `
                <tr>
                    <td>${field.name}</td>
                    <td>${field.alias}</td>
                    <td>${field.type}</td>
                </tr>
            `).join("")}
        `;
    } catch (error) {
        layerInfoSection.innerHTML = `<p class="error">Failed to fetch sublayer info.</p>`;
        console.error(error);
    }
}
