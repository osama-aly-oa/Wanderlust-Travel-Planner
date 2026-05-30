# ✈️ Wanderlust — Digital Travel Planner 🌍

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-blue?style=flat-square&logo=googlechrome&logoColor=white)](https://osama-aly-oa.github.io/Wanderlust-Travel-Planner/)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla_ES6-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

**Wanderlust** is a lightweight Single-Page Application (SPA) designed to help travelers plan their trips by consolidating essential destination research—such as local weather, public holidays, local events, currency exchange rates, and daylight coordinates—into a single, serverless client-side dashboard.

🔗 **Live Demo**: [osama-aly-oa.github.io/Wanderlust-Travel-Planner/](https://osama-aly-oa.github.io/Wanderlust-Travel-Planner/)

---

## 💡 Key Strengths & Accomplishments

* **Consolidated Travel Hub**: Merges all critical research tools (weather, holidays, local events, currency conversions, and sun times) into one clean interface, eliminating the need to browse multiple sites.
* **6-API Integration**: Seamlessly aggregates and coordinates real-time data from six different public APIs.
* **Serverless & Independent**: Built as a pure frontend solution with zero database or backend server requirements.
* **Local Itinerary Planner**: Allows users to save favorite holidays, weekends, or events to a personal travel itinerary that persists locally across browser sessions.

---

## 🛠️ Main Features

* **Interactive Dashboard**: Quick lookup of essential country metadata (flag, region, capital, population, calling code, neighbors, and driving rules).
* **Weather Forecast**: Dynamic 7-day daily forecast and 12-hour indicators, featuring adaptive precipitation visibility based on rain probability.
* **Public Holidays & Long Weekends**: Highlights official national holidays and calculates optimal long weekend bridge-day options based on regional weekend structures.
* **Local Events Finder**: Lists upcoming city events with automatic local fallback templates in case of connectivity issues.
* **Integrated Currency Converter**: Auto-detects local currency codes and calculates conversions from USD with an interactive conversion matrix.
* **Sunrise/Sunset Coordinates**: Visualizes civil dawn, twilight, and daylight ratios based on geographic lat/long coordinates.

---

## 💻 Tech Stack & APIs

* **Frontend**: HTML5, Vanilla CSS3 (custom variables, frosted glass effects, and responsive layout), Vanilla ES6+ JavaScript.
* **Storage**: Web `localStorage` API for itinerary persistence.
* **Third-Party Libraries**: FontAwesome 6 (UI icons), SweetAlert2 (custom notifications).
* **API Suite**:
  1. **REST Countries API** (Geographic and country metadata)
  2. **Nager.Date API** (Public holidays and long weekend structures)
  3. **Open-Meteo API** (Hava durumu and precipitation forecasts)
  4. **Ticketmaster API** (City event search queries)
  5. **ExchangeRate-API** (Live currency conversion rates)
  6. **Sunrise-Sunset API** (Civil twilight and daylight times)

---

## 🚀 Execution & Setup

No servers, builders, or installation required.
1. **Clone the repository**:
   ```bash
   git clone https://github.com/osama-aly-oa/Wanderlust-Travel-Planner.git
   ```
2. **Launch the application**:
   Open the folder and double-click **`index.html`** to run the app instantly in any modern web browser.

---

## 📌 Implementation Note
*To ensure the application can be opened directly from the local file system (using the `file://` protocol) without triggering browser CORS errors typical of modular script imports, the codebase is consolidated into a single unified script (`src/js/main.js`). The internal structure is strictly organized into clean ES6 classes (State, ApiService, Router, and Views) to preserve modularity and a clear MVC structure.*
