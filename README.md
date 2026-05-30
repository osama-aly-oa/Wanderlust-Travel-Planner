# ✈️ Wanderlust — Digital Travel Planner 🌍

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-blue?style=flat-square&logo=googlechrome&logoColor=white)](https://osama-aly-oa.github.io/Wanderlust-Travel-Planner/)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla_ES6-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Architecture](https://img.shields.io/badge/Architecture-OOP_/_MVC-lightgrey?style=flat-square)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)

**Wanderlust** is a lightweight, responsive client-side Single-Page Application (SPA) designed to consolidate essential travel planning information—such as weather forecasts, public holidays, local events, currency exchange rates, and daylight times—into a single, consolidated dashboard. 

---

## 🏗️ Architecture & Implementation Notes

### 1. Unified Single-File Script Packaging (CORS Bypass)
Modern browsers block modular ES6 script imports (`import`/`export`) when loading HTML files directly from the local file system (via the `file://` protocol) due to Cross-Origin Resource Sharing (CORS) security policies. 

To ensure this application can be launched offline directly by double-clicking `index.html` without requiring a local web server (like Node.js, Live Server, etc.), all MVC classes and logic have been consolidated into a single unified script file (`src/js/main.js`). 

Despite being packaged in a single file, the codebase strictly maintains a modular **Object-Oriented Programming (OOP)** and **Model-View-Controller (MVC)** separation of concerns:
* **Model (`State` Class)**: Houses client-side variables (selected country, city, active view, and user itineraries) as a single source of truth.
* **Views (`AbstractView` & Subclasses)**: Handle UI/DOM updates, rendering HTML templates dynamically, and managing events using **Event Delegation** on dynamically added elements.
* **Controller (`AppController` Class)**: Coordinates application flow, initializing routing, reacting to state changes, and making requests to the API Service.
* **Router (`Router` Class)**: Manages clean, hash-based URL navigation (e.g., `#/weather`).

### 2. Network vs. Offline Connectivity Limits
* **Offline Functionality**: The application shell, internal routing, UI navigation, styling transitions, and itinerary planning (`My Plans`) are fully functional offline. Saved itineraries are persisted on the client-side via the browser's `LocalStorage` API.
* **Online Data Fetching**: Retrieving real-time, dynamic travel details requires an active internet connection to contact third-party API endpoints. 
* **Fallback Handling**: If an API request fails due to no internet connection or server errors, the system catches the exception gracefully. It displays a non-blocking toast warning and falls back to localized placeholder datasets (such as city-hash randomized lists for events) to prevent application crashes.

---

## 🛠️ Core Functional Modules

1. **Dashboard Overview**: Displays core country statistics (flag, region, timezone, capital, population, calling codes, neighbors, driving side, and official currency).
2. **Public Holidays**: Fetches annual official holidays using Nager.Date, allowing users to save selected holidays directly to their itineraries.
3. **Local Events**: Queries Ticketmaster for local events. For regions where API access is limited or offline, the app implements a local city-hash generator to produce mock event lists.
4. **Weather Forecast (Open-Meteo)**: Fetches 7-day daily forecasts and 12-hour indicators using coordinates.
   - *Precipitation Logic*: If the daily rain probability is 15% or less, the rain indicator is hidden from view to maintain a clean interface. If probability exceeds 15%, it draws a rain pill with a cloud-rain icon.
5. **Long Weekends**: Analyzes holiday calendars and maps them adjacent to weekend structures (customized by region, such as Fri/Sat for Egypt and Sat/Sun internationally) to suggest short vacation windows.
6. **Currency Converter**: Synchronizes automatically with the destination country's currency code. Calculates conversions from USD using ExchangeRate-API rates, and provides a quick conversion reference table.
7. **Sunrise & Sunset**: Calculates daylight distribution (civil dawn, sunset, twilight, and daylight ratios) using the Sunrise-Sunset API and renders a visual progress arc.
8. **Itinerary Manager (My Plans)**: Consolidates and lists saved holidays, events, or weekends. Features specific deletion confirmations and success toasts.

---

## 🎨 User Interface & Styling

* **Frosted-Glass Navigation (Desktop & Mobile)**: Built using vanilla CSS and responsive layout rules. On viewport widths below `1024px`, the `.top-header` switches to `position: fixed` with a frosted-glass blur effect (`backdrop-filter`) to provide persistent navigation while scrolling.
* **Gradient Loading Overlay**: A standard animated overlay containing three concentric gradient rings and a paper plane icon that activates during API requests to indicate data loading state.
* **Whitesmoke Theme Alerts**: Actions related to itinerary management (individual item deletion and clearing all plans) trigger custom whitesmoke (`#f5f5f5`) notifications to visually separate destructive user actions from ordinary notification alerts.
* **Vector Favicon**: Embeds a travel-themed SVG Data-URI directly in the HTML template head, removing the need for external `.png` or `.ico` assets.

---

## 🔌 API Integrations

The application utilizes the following public endpoints:
1. **REST Countries API** (`https://restcountries.com/v3.1`)
2. **Nager.Date API** (`https://date.nager.at/api/v3`)
3. **Open-Meteo API** (`https://api.open-meteo.com/v1`)
4. **Ticketmaster API** (`https://app.ticketmaster.com/discovery/v2`)
5. **ExchangeRate-API** (`https://v6.exchangerate-api.com/v6`)
6. **Sunrise-Sunset API** (`https://api.sunrise-sunset.org/json`)

---

## 🚀 Setup & Execution

Since the project uses pure client-side technologies, it requires no compilers, build pipelines, or dev-server dependencies.
1. **Clone the repository**:
   ```bash
   git clone https://github.com/osama-aly-oa/Wanderlust-Travel-Planner.git
   ```
2. **Launch the application**:
   Double-click **`index.html`** in your file manager to run it instantly in any modern web browser.
