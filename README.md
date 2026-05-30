# ✈️ Wanderlust — Your Digital Travel Planner 🌍

[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla_ES6-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Architecture](https://img.shields.io/badge/Architecture-OOP_/_MVC-blueviolet?style=for-the-badge)](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
[![CORS Bypass](https://img.shields.io/badge/CORS_Bypass-100%25_Offline-success?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
[![API Suite](https://img.shields.io/badge/APIs-Integrated_Suite-orange?style=for-the-badge)](https://restcountries.com/)

> **Wanderlust** is a premium, state-of-the-art digital travel companion web application built purely with **Vanilla Javascript (ES6+)**, **Object-Oriented Programming (OOP)**, and the **Model-View-Controller (MVC)** architectural pattern. 
> 
> Engineered to run **100% offline** directly from the local file system (using the `file://` protocol) by bypassing browser CORS restrictions via a unified modular codebase.

---

## 🌟 Visual & Interactive Excellence

- **Concentric Spinner Rings**: A high-end loading overlay featuring 3 animated, concentric rings spinning in opposite directions (colored in brand-blue, violet, and emerald) with a bouncing paper plane floating in the center.
- **Micro-Animations & Responsive Hover Effects**: Gorgeous grid layouts, cards that elevate on hover, and custom icons that respond organically to interaction.
- **Smart Toast Notifications**: Integrated SweetAlert2 notifications displaying beautifully at the **bottom-right (`bottom-end`)** with a custom theme matching the sidebar's dark primary gradient (`var(--primary-900)`).
- **Custom Whitesmoke Dialogs**: Explicit visual styling for destructive actions (like clearing all plans) utilizing a pristine **whitesmoke (`#f5f5f5`)** theme, soft shadow overlays, and modern rounded card styling.

---

## 🚀 Core Features

### 1. 📊 Interactive Dashboard
- **Global Selector**: Live country selector (+90 countries) and dynamic capital/tourist city populate triggers.
- **REST Countries Data**: Dynamic statistics display including flag, region, ticking timezone clock, capital, population, calling codes, currency, and neighbouring boundaries.
- **Clean Filters**: Clear selection "x" button resets application states and renders a premium responsive empty-state dashboard placeholder.

### 2. 📅 Public Holidays Explorer
- **Dynamic Descriptions**: Subtitle headers immediately update to show chosen country variables (*e.g., "Browse public holidays for France..."*).
- **Holiday Calendars**: Fetches standard Nager.Date holiday arrays, parses dates, and toggles heart plan indicators.

### 3. 🎟️ Dynamic Events Finder
- **Intelligent Fallbacks**: Queries Ticketmaster and implements a rich mathematical city-hash generator to produce highly diversified mock events (unique venues, varied dates, and randomized high-quality photography) for overseas regions.
- **Organic Feel**: Each city query renders completely fresh imagery, dates, and titles, ensuring a truly dynamic visual experience.

### 4. 🌤️ Weather Forecast
- **Dynamic City Coordinates**: Resolves exact geocoordinates for secondary cities (Alexandria, Munich, Los Angeles, Dubai, Yokohama, etc.) dynamically!
- **Expectation Meters**: Displays a 7-day forecast and scrollable 12-hour indicators.
- **Smart Precipitation Cards**: Hides the rain probability pill completely from the daily cards if there's no rain, and dynamically displays a cute `<i class="fa-solid fa-cloud-rain"></i>` rain pill with its exact percentage when rain is expected!

### 5. 🏖️ Long Weekends Trip Optimizer
- **Bridge Day Calculators**: Identifies and categorizes public holiday arrays near weekends to suggest ideal short vacation windows.
- **Visual Timelines**: Renders week-day visual grids adjusting to varying weekends (e.g. Fri/Sat for Egypt, Sat/Sun internationally).

### 6. 💱 Dynamic Currency Converter
- **Auto-Mapping**: Selecting a destination country automatically selects and locks its official currency code as the target, calculating live conversions from USD instantly upon visiting the section.
- **Rates Table**: Visualizes a quick conversion grid of popular global currency pairs.

### 7. ☀️ Sunrise & Sunset Times
- **Daylight Distribution**: Renders civil dawn, twilight, golden hour, and day length ratios with smooth animated circular progress bars.

### 8. ❤️ My Itinerary Plans
- **Itinerary Manager**: Locally caches and visualizes saved holidays, events, or weekends with responsive badge counters.

---

## 🛠️ Technology Stack

- **Frontend Core**: HTML5 (Semantic elements), CSS3 Variables & Custom Transitions.
- **Programming Pattern**: Pure ES6 Object-Oriented Programming (OOP) utilizing Model-View-Controller (MVC) architecture.
- **Routing**: Client-side hash routing (`index.html#/weather`) and popstate dynamic routers.
- **Storage**: Real-time browser `localStorage` syncing.
- **Third-Party Libraries**: FontAwesome 6 (scalable icons), SweetAlert2 (overlays).

---

## 🔌 API Reference Suite

The app integrates six distinct endpoints concurrently:
1. **REST Countries API** (`https://restcountries.com/v3.1`)
2. **Nager.Date API** (`https://date.nager.at/api/v3`)
3. **Open-Meteo API** (`https://api.open-meteo.com/v1`)
4. **Ticketmaster API** (`https://app.ticketmaster.com/discovery/v2`)
5. **ExchangeRate-API** (`https://v6.exchangerate-api.com/v6`)
6. **Sunrise-Sunset API** (`https://api.sunrise-sunset.org/json`)

---

## 🚀 Getting Started

No servers, installers, or configuration needed.
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/wanderlust-travel-planner.git
   ```
2. **Launch the app**:
   Simply go inside the folder and double-click **`index.html`** to run it natively on any browser via `file://` protocol!

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
