# BigQuery Release Notes Viewer & Tweet Hub 🚀

A premium, interactive web application built with **Python Flask**, **Vanilla CSS**, and **Vanilla JavaScript** to monitor, search, and Tweet about Google Cloud BigQuery release updates.

## ✨ Features

- **Automated Atom XML Parsing**: Fetches release notes directly from Google Cloud feeds.
- **Granular Update Decomposition**: Intelligently decomposes daily release walls into single, category-tagged items (e.g. *Features*, *Changes*, *Issues & Fixes*, *Deprecations*).
- **Advanced UI Filtering & Search**: Tweak categories using visual stats blocks or pills, combined with a real-time keyword search.
- **Visual Analytics**: Interactive counter blocks displaying aggregate stats across all categorized updates.
- **Multi-Select Selection Model**: Select specific release items to compile a combined Tweet or share individually.
- **Interactive X/Twitter Draft Tool**: Custom tweet composer featuring a live mock preview (matching Twitter UI), standard 280-character limit counter, and visual character overflow warnings.
- **Optimized Caching**: Cached feed parsed data to keep page loads lightning fast, with a dedicated **Refresh** action to pull live updates on demand.
- **Rich Aesthetics**: Premium dark theme featuring smooth glowing gradients, glassmorphism, responsive grid design, and clean custom micro-animations.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.14 + Flask, BeautifulSoup4 (HTML Parsing), requests / urllib (Feed Fetching)
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom variables, responsive grids, transitions), Vanilla JavaScript (ES6+ State management, dynamic templates, DOM events)
- **APIs & Sharing**: Google Cloud Feeds API + Twitter Web Intents API

---

## 🚀 How to Run the Application

### Prerequisite
Make sure you have Python 3.x installed on your system.

### Steps to Launch
1. **Open PowerShell/Command Prompt** in the project directory:
   ```powershell
   cd D:\agy-cli-projects\bigquery-release-viewer
   ```

2. **Activate the Virtual Environment**:
   - On **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - On **Windows (Command Prompt)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```

3. **Start the Flask Server**:
   ```bash
   python app.py
   ```

4. **Access the App**:
   Open your browser and navigate to:
   👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📂 Project Structure

- [app.py](file:///D:/agy-cli-projects/bigquery-release-viewer/app.py) - Main Flask application containing API endpoints, caching layer, and BeautifulSoup parser.
- [templates/index.html](file:///D:/agy-cli-projects/bigquery-release-viewer/templates/index.html) - HTML template featuring standard semantic structures, modal overlays, inline SVGs, and responsive layouts.
- [static/css/style.css](file:///D:/agy-cli-projects/bigquery-release-viewer/static/css/style.css) - Premium Vanilla CSS variables, dark-mode styling, glassmorphism, animations, and typography rules.
- [static/js/app.js](file:///D:/agy-cli-projects/bigquery-release-viewer/static/js/app.js) - Client-side state manager handling dynamic HTML rendering, search filters, state updates, toast alerts, selection logic, and modal customization.

---

## 📱 Interface Preview & Interaction Guide

1. **Stats Cards & Pills**: Click any stat card (like *Features* or *Issues*) or pill buttons to filter the list immediately.
2. **Search Input**: Start typing keywords (e.g. `Gemini`, `Studio`, `Resize`) to instantly query titles and details.
3. **Checkboxes**: Click a card's checkbox (or anywhere on the card body) to add it to your selection. A floating bar appears at the bottom.
4. **Tweet Selection (Bulk)**: Click **Tweet Selection** in the bottom floating bar to open the Tweet composer with selected updates concatenated.
5. **Tweet Card (Individual)**: Click the **X icon** on the top-right of any individual update card to draft a Tweet about only that update.
6. **Tweet Customizer**: Edit the text in the modal. Standard Twitter character boundaries (280 chars) are displayed dynamically. Click **Copy Text** or **Post on X** to publish!
