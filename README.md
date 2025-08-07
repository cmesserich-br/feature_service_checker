
# ArcGIS Feature Layer Inspector

A lightweight, browser-based tool for quickly inspecting public ArcGIS Feature Services and Feature Layers.

## 🔍 What It Does

Paste a public-facing ArcGIS REST Feature Service or Feature Layer URL, and the app will:

- Detect if the link is a Feature Service or individual layer
- Let you select which layer to inspect (if multiple are available)
- Display key metadata:
  - Layer name and description
  - Feature count
  - Geometry type
- Display the schema (field names, aliases, and types)
- Preview sample data records
- Format JSON with syntax highlighting for easy readability
- Export:
  - Field schema as CSV
  - Sample records as CSV

## ✅ Example Use Cases

- Quickly assess the structure of an unfamiliar dataset
- Determine credit usage risk before publishing layers to ArcGIS Online
- Share a quick summary of a dataset with team members or clients
- Troubleshoot external Feature Service URLs during QA

## 🛠️ Technologies

- HTML, CSS, JavaScript (no frameworks or build tools)
- Hosted via GitHub Pages
- Uses ArcGIS REST API (`?f=json`, `/query`)

## 🚀 How to Use

1. Visit the app in your browser:  
   [https://your-username.github.io/your-repo-name/](https://cmesserich-br.github.io/feature_service_checker/)

2. Paste a URL like:  
   `https://services.arcgis.com/.../FeatureServer`  
   or  
   `https://services.arcgis.com/.../FeatureServer/0`

3. Select a layer (if needed) and click **Inspect Selected Layer**

4. View metadata, schema, and sample data in a clean interface

5. Optionally export the info as CSV

## 📦 Example URLs

Try these to test the app:

- Living Atlas:  
  `https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Counties_Generalized/FeatureServer`
- Feature Layer:  
  `https://opendata.arcgis.com/datasets/35c0b3587c49436bb5e2aa0a0c577d76_0/FeatureServer/0`

## 🧑‍💻 Author

Built by CM as part of an internal tools initiative and coding skill development.  
Feedback and ideas welcome!
