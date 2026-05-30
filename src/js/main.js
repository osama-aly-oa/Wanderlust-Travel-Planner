// Wanderlust Digital Travel Planner - Unified Core Application Script
// Built with MVC and Object-Oriented Programming (OOP)
// Compatible with file:// protocol execution (Offline/Direct double-click)

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================
const CONFIG = {
  // ExchangeRate-API Key
  EXCHANGE_RATE_KEY: '805842951e5953ad31497176',
  
  // Ticketmaster API Key
  TICKETMASTER_KEY: 'VwECw2OiAzxVzIqnwmKJUG41FbeXJk1y',
  
  // Base endpoints for APIs
  ENDPOINTS: {
    NAGER_DATE: 'https://date.nager.at/api/v3',
    REST_COUNTRIES: 'https://restcountries.com/v3.1',
    OPEN_METEO: 'https://api.open-meteo.com/v1',
    TICKETMASTER: 'https://app.ticketmaster.com/discovery/v2',
    EXCHANGE_RATE: 'https://v6.exchangerate-api.com/v6',
    SUNRISE_SUNSET: 'https://api.sunrise-sunset.org/json',
    FLAG_CDN: 'https://flagcdn.com'
  }
};

// ============================================================================
// 2. STATE MANAGEMENT (Model)
// ============================================================================
class AppState {
  constructor() {
    this.listeners = [];
    
    // Load initial plans from LocalStorage
    let initialPlans = [];
    try {
      const stored = localStorage.getItem('wanderlust_plans');
      initialPlans = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading localStorage', e);
    }

    // Default initial state values
    this.state = {
      selectedCountry: 'EG',
      selectedCountryData: null,
      selectedCity: 'Cairo',
      selectedYear: 2026,
      currentView: 'dashboard',
      savedPlans: initialPlans,
      isLoading: false,
      weatherData: null,
      eventsData: null,
      holidaysData: null,
      longWeekendsData: null,
      sunTimesData: null,
      exchangeRates: null
    };
  }

  // Get current active state value
  get() {
    return this.state;
  }

  // Subscribe a listener callback to react to state changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Update multiple fields in the state and trigger subscribers
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Notify all listeners of the state update
    this.listeners.forEach(listener => {
      try {
        listener(this.state, oldState);
      } catch (e) {
        console.error('Error in state listener callback', e);
      }
    });
  }

  // Save a holiday, event, or long weekend to plans
  savePlan(item) {
    // Generate a unique ID if not present
    const id = item.id || `${item.type}-${item.date || ''}-${item.title || ''}`.replace(/\s+/g, '-').toLowerCase();
    
    // Check if already exists
    if (this.state.savedPlans.some(p => p.id === id)) {
      return { success: false, message: 'Item already in your plans!' };
    }

    const newItem = {
      ...item,
      id,
      savedAt: new Date().toISOString()
    };

    const updatedPlans = [...this.state.savedPlans, newItem];
    this.setState({ savedPlans: updatedPlans });
    
    // Sync with LocalStorage
    try {
      localStorage.setItem('wanderlust_plans', JSON.stringify(updatedPlans));
    } catch (e) {
      console.error('Failed to sync to LocalStorage', e);
    }

    return { success: true, item: newItem };
  }

  // Delete an item from plans by ID
  deletePlan(id) {
    const updatedPlans = this.state.savedPlans.filter(p => p.id !== id);
    this.setState({ savedPlans: updatedPlans });
    
    try {
      localStorage.setItem('wanderlust_plans', JSON.stringify(updatedPlans));
    } catch (e) {
      console.error('Failed to sync to LocalStorage', e);
    }
  }

  // Clear all saved plans
  clearAllPlans() {
    this.setState({ savedPlans: [] });
    try {
      localStorage.setItem('wanderlust_plans', JSON.stringify([]));
    } catch (e) {
      console.error('Failed to clear LocalStorage', e);
    }
  }

  // Check if an item is already saved
  isItemSaved(id) {
    return this.state.savedPlans.some(p => p.id === id);
  }
}

// ============================================================================
// 3. API SERVICE MODULE
// ============================================================================
class ApiService {
  constructor() {
    this.cache = new Map();
  }

  // Helper fetch with caching
  async _fetchCached(url, cacheKey, ttl = 300000) {
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < ttl)) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (e) {
      console.error(`API Fetch Failed for URL: ${url}`, e);
      throw e;
    }
  }

  // Get Available Countries
  async getAvailableCountries() {
    const url = `${CONFIG.ENDPOINTS.NAGER_DATE}/AvailableCountries`;
    return this._fetchCached(url, 'available_countries', 3600000);
  }

  // Get Country Details
  async getCountryDetails(countryCode) {
    const url = `${CONFIG.ENDPOINTS.REST_COUNTRIES}/alpha/${countryCode}`;
    const cacheKey = `country_details_${countryCode}`;
    
    try {
      const data = await this._fetchCached(url, cacheKey, 3600000);
      if (Array.isArray(data) && data.length > 0) {
        const c = data[0];
        const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : '';
        const currency = currencyKey ? c.currencies[currencyKey] : null;
        const languages = c.languages ? Object.values(c.languages) : [];
        const capitalLatLng = c.capitalInfo && c.capitalInfo.latlng ? c.capitalInfo.latlng : null;

        return {
          name: c.name.common,
          officialName: c.name.official,
          code: countryCode,
          flagUrl: c.flags.png || `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`,
          capital: c.capital ? c.capital[0] : 'N/A',
          region: c.region,
          subregion: c.subregion,
          population: c.population.toLocaleString(),
          area: c.area ? c.area.toLocaleString() : 'N/A',
          continent: c.continents ? c.continents[0] : 'N/A',
          callingCode: c.idd && c.idd.root ? `${c.idd.root}${c.idd.suffixes ? c.idd.suffixes[0] : ''}` : 'N/A',
          drivingSide: c.car && c.car.side ? c.car.side : 'N/A',
          weekStarts: c.startOfWeek ? c.startOfWeek : 'Sunday',
          currencyName: currency ? `${currency.name} (${currency.symbol || ''})` : 'N/A',
          currencyCode: currencyKey,
          languages: languages.join(', '),
          neighbors: c.borders || [],
          latlng: c.latlng || [30.04, 31.23],
          capitalLatLng: capitalLatLng || c.latlng || [30.04, 31.23]
        };
      }
      throw new Error('No country details found');
    } catch (e) {
      console.error(`Error parsing REST Countries data for ${countryCode}`, e);
      throw e;
    }
  }

  // Get Public Holidays
  async getPublicHolidays(year, countryCode) {
    const url = `${CONFIG.ENDPOINTS.NAGER_DATE}/PublicHolidays/${year}/${countryCode}`;
    const cacheKey = `holidays_${year}_${countryCode}`;
    return this._fetchCached(url, cacheKey, 3600000);
  }

  // Get Long Weekends
  async getLongWeekends(year, countryCode) {
    const url = `${CONFIG.ENDPOINTS.NAGER_DATE}/LongWeekend/${year}/${countryCode}`;
    const cacheKey = `longweekends_${year}_${countryCode}`;
    return this._fetchCached(url, cacheKey, 3600000);
  }

  // Get Weather Forecast
  async getWeather(lat, lon) {
    const url = `${CONFIG.ENDPOINTS.OPEN_METEO}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;
    const cacheKey = `weather_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    return this._fetchCached(url, cacheKey, 600000);
  }

  // Search Events from Ticketmaster
  async getEvents(city, countryCode) {
    const cleanCity = encodeURIComponent(city);
    const url = `${CONFIG.ENDPOINTS.TICKETMASTER}/events.json?apikey=${CONFIG.TICKETMASTER_KEY}&city=${cleanCity}&countryCode=${countryCode}&size=20`;
    const cacheKey = `events_${cleanCity}_${countryCode}`;
    
    try {
      const data = await this._fetchCached(url, cacheKey, 1800000);
      if (data._embedded && data._embedded.events) {
        return data._embedded.events.map(ev => ({
          id: ev.id,
          title: ev.name,
          type: 'event',
          category: ev.classifications && ev.classifications[0] && ev.classifications[0].segment ? ev.classifications[0].segment.name : 'Other',
          date: ev.dates.start.localDate,
          time: ev.dates.start.localTime ? ev.dates.start.localTime.substring(0, 5) : 'All Day',
          venue: ev._embedded && ev._embedded.venues && ev._embedded.venues[0] ? ev._embedded.venues[0].name : 'Local Venue',
          city: city,
          imageUrl: ev.images && ev.images[0] ? ev.images[0].url : 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
          ticketUrl: ev.url || '#'
        }));
      }
      return [];
    } catch (e) {
      console.warn('Ticketmaster Event fetch failed', e);
      return [];
    }
  }

  // Get Sun Times
  async getSunTimes(lat, lon, dateString) {
    const url = `${CONFIG.ENDPOINTS.SUNRISE_SUNSET}?lat=${lat}&lng=${lon}&date=${dateString}&formatted=0`;
    const cacheKey = `suntimes_${lat.toFixed(4)}_${lon.toFixed(4)}_${dateString}`;
    
    try {
      const res = await this._fetchCached(url, cacheKey, 3600000);
      if (res.status === 'OK' && res.results) {
        return res.results;
      }
      throw new Error('Sunrise-Sunset status not OK');
    } catch (e) {
      console.error('Failed fetching Sunrise-Sunset times', e);
      throw e;
    }
  }

  // Get Latest Rates
  async getLatestRates(base = 'USD') {
    const url = `${CONFIG.ENDPOINTS.EXCHANGE_RATE}/${CONFIG.EXCHANGE_RATE_KEY}/latest/${base}`;
    const cacheKey = `rates_${base}`;
    return this._fetchCached(url, cacheKey, 3600000);
  }
}

// ============================================================================
// 4. CLIENT-SIDE ROUTER MODULE
// ============================================================================
class Router {
  constructor(onRouteMatch) {
    this.onRouteMatch = onRouteMatch;
    
    this.routes = {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/holidays': 'holidays',
      '/events': 'events',
      '/weather': 'weather',
      '/long-weekends': 'long-weekends',
      '/currency': 'currency',
      '/sun-times': 'sun-times',
      '/plans': 'my-plans',
      '/my-plans': 'my-plans'
    };

    this.viewPaths = {
      'dashboard': '/dashboard',
      'holidays': '/holidays',
      'events': '/events',
      'weather': '/weather',
      'long-weekends': '/long-weekends',
      'currency': '/currency',
      'sun-times': '/sun-times',
      'my-plans': '/plans'
    };
  }

  init() {
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    window.addEventListener('hashchange', () => {
      if (window.location.protocol === 'file:') {
        this.handleRoute();
      }
    });

    this.handleRoute();
  }

  handleRoute() {
    let path = window.location.pathname;

    if (window.location.protocol === 'file:' || window.location.hash) {
      path = window.location.hash.replace('#', '') || '/';
    }

    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const view = this.routes[path] || 'dashboard';
    this.onRouteMatch(view);
  }

  navigate(viewName) {
    const path = this.viewPaths[viewName] || '/';
    
    if (window.location.protocol === 'file:') {
      window.location.hash = `#${path}`;
    } else {
      const currentPath = window.location.pathname;
      if (currentPath !== path && currentPath + '/' !== path) {
        window.history.pushState({ view: viewName }, '', path);
      }
    }

    this.onRouteMatch(viewName);
  }
}

// ============================================================================
// 5. VIEW DEFINITIONS
// ============================================================================
class View {
  constructor(elementId, state, apiService) {
    this.element = document.getElementById(elementId);
    this.state = state;
    this.api = apiService;
  }

  show() {
    if (this.element) this.element.classList.add('active');
  }

  hide() {
    if (this.element) this.element.classList.remove('active');
  }
}

// --- Dashboard View ---
class DashboardView extends View {
  constructor(state, apiService) {
    super('dashboard-view', state, apiService);
    this.countrySelect = document.getElementById('global-country');
    this.citySelect = document.getElementById('global-city');
    this.yearSelect = document.getElementById('global-year');
    this.countryInfoContainer = document.getElementById('dashboard-country-info');
    
    this.statSaved = document.getElementById('stat-saved');
    this.statHolidays = document.getElementById('stat-holidays');
  }

  render(data) {
    const { savedPlans } = this.state.get();
    if (this.statSaved) {
      this.statSaved.textContent = savedPlans.length;
    }
    if (data && data.countryData) {
      this.renderCountryInfo(data.countryData);
    } else {
      this.renderEmptyState();
    }
  }

  renderEmptyState() {
    if (!this.countryInfoContainer) return;
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.countryInfoContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: var(--primary-500);"><i class="fa-solid fa-earth-americas"></i></div>
        <h3>No Country Selected</h3>
        <p>Please select a destination country and city above, then click <strong>Explore</strong> to load plans, holidays, weather, and more!</p>
      </div>
    `;
    if (this.statHolidays) {
      this.statHolidays.textContent = '0';
    }
  }

  populateCountries(countries) {
    if (!this.countrySelect) return;
    const currentVal = this.countrySelect.value || 'EG';
    this.countrySelect.innerHTML = '<option value="">Select Country</option>';
    const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach(c => {
      const option = document.createElement('option');
      option.value = c.countryCode;
      option.textContent = `${c.name}`;
      if (c.countryCode === currentVal) option.selected = true;
      this.countrySelect.appendChild(option);
    });
  }

  populateCities(capital, currentSelectedCity = '') {
    if (!this.citySelect) return;
    this.citySelect.innerHTML = '';
    
    const capitalOption = document.createElement('option');
    capitalOption.value = capital;
    capitalOption.textContent = `${capital} (Capital)`;
    capitalOption.selected = true;
    this.citySelect.appendChild(capitalOption);

    const secondaryCities = {
      'EG': ['Alexandria', 'Sharm El Sheikh', 'Giza', 'Luxor'],
      'US': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'San Francisco'],
      'FR': ['Marseille', 'Lyon', 'Nice', 'Toulouse'],
      'GB': ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
      'IT': ['Rome', 'Milan', 'Venice', 'Florence'],
      'ES': ['Madrid', 'Barcelona', 'Seville', 'Valencia'],
      'DE': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
      'JP': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
      'SA': ['Riyadh', 'Jeddah', 'Mecca', 'Medina'],
      'AE': ['Dubai', 'Abu Dhabi', 'Sharjah']
    };

    const countryCode = this.countrySelect.value;
    const extraCities = secondaryCities[countryCode] || [];
    
    extraCities.forEach(city => {
      if (city.toLowerCase() !== capital.toLowerCase()) {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        if (city.toLowerCase() === currentSelectedCity.toLowerCase()) {
          option.selected = true;
        }
        this.citySelect.appendChild(option);
      }
    });
  }

  renderCountryInfo(c) {
    if (!this.countryInfoContainer) return;
    if (this.statHolidays && this.state.get().holidaysData) {
      this.statHolidays.textContent = this.state.get().holidaysData.length;
    }

    this.countryInfoContainer.innerHTML = `
      <div class="dashboard-country-header">
        <img src="${c.flagUrl}" alt="${c.name}" class="dashboard-country-flag">
        <div class="dashboard-country-title">
          <h3>${c.name}</h3>
          <p class="official-name">${c.officialName}</p>
          <span class="region"><i class="fa-solid fa-location-dot"></i> ${c.continent} • ${c.region}</span>
        </div>
      </div>
      
      <div class="dashboard-local-time">
        <div class="local-time-display">
          <i class="fa-solid fa-clock"></i>
          <span class="local-time-value" id="country-local-time">Loading...</span>
        </div>
      </div>
      
      <div class="dashboard-country-grid">
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-building-columns"></i>
          <span class="label">Capital</span>
          <span class="value">${c.capital}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-users"></i>
          <span class="label">Population</span>
          <span class="value">${c.population}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-ruler-combined"></i>
          <span class="label">Area</span>
          <span class="value">${c.area} km²</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-globe"></i>
          <span class="label">Continent</span>
          <span class="value">${c.continent}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-phone"></i>
          <span class="label">Calling Code</span>
          <span class="value">${c.callingCode}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-car"></i>
          <span class="label">Driving Side</span>
          <span class="value">${c.drivingSide}</span>
        </div>
        <div class="dashboard-country-detail">
          <i class="fa-solid fa-calendar-week"></i>
          <span class="label">Week Starts</span>
          <span class="value">${c.weekStarts}</span>
        </div>
      </div>
      
      <div class="dashboard-country-extras">
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-coins"></i> Currency</h4>
          <div class="extra-tags">
            <span class="extra-tag">${c.currencyName} (${c.currencyCode})</span>
          </div>
        </div>
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-language"></i> Languages</h4>
          <div class="extra-tags">
            <span class="extra-tag">${c.languages}</span>
          </div>
        </div>
        <div class="dashboard-country-extra">
          <h4><i class="fa-solid fa-map-location-dot"></i> Neighbors</h4>
          <div class="extra-tags">
            ${c.neighbors.length > 0 
              ? c.neighbors.map(n => `<span class="extra-tag border-tag">${n}</span>`).join('') 
              : '<span class="extra-tag">None</span>'}
          </div>
        </div>
      </div>
      
      <div class="dashboard-country-actions">
        <a href="https://www.google.com/maps/place/${encodeURIComponent(c.name)}" target="_blank" class="btn-map-link">
          <i class="fa-solid fa-map"></i> View on Google Maps
        </a>
      </div>
    `;

    this.startTicking(c.capital);
  }

  startTicking(capital) {
    if (this.clockInterval) clearInterval(this.clockInterval);
    const updateTime = () => {
      const el = document.getElementById('country-local-time');
      if (!el) return;
      el.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
    };
    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }
}

// --- Holidays View ---
class HolidaysView extends View {
  constructor(state, apiService) {
    super('holidays-view', state, apiService);
    this.content = document.getElementById('holidays-content');
    this.selectionHeader = document.getElementById('holidays-selection');
    this.headerDesc = this.element ? this.element.querySelector('.view-header-content p') : null;
  }

  render(holidays) {
    if (!this.content) return;
    const { selectedCountryData, selectedYear } = this.state.get();
    
    const countryName = selectedCountryData ? selectedCountryData.name : 'your destination';
    if (this.headerDesc) {
      this.headerDesc.textContent = `Browse public holidays for ${countryName} and plan your trips around them`;
    }

    if (this.selectionHeader && selectedCountryData) {
      this.selectionHeader.innerHTML = `
        <div class="current-selection-badge">
          <img src="${selectedCountryData.flagUrl}" alt="${selectedCountryData.name}" class="selection-flag">
          <span>${selectedCountryData.name}</span>
          <span class="selection-year">${selectedYear}</span>
        </div>
      `;
    }

    if (!holidays || holidays.length === 0) {
      this.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
          <h3>No public holidays found</h3>
          <p>We couldn't retrieve holiday information for this country.</p>
        </div>
      `;
      return;
    }

    this.content.innerHTML = '';
    holidays.forEach(h => {
      const date = new Date(h.date);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const weekday = date.toLocaleString('en-US', { weekday: 'long' });
      const id = `holiday-${h.date}-${h.name}`.replace(/\s+/g, '-').toLowerCase();
      const isSaved = this.state.isItemSaved(id);
      
      const card = document.createElement('div');
      card.className = 'holiday-card';
      card.innerHTML = `
        <div class="holiday-card-header">
          <div class="holiday-date-box"><span class="day">${day}</span><span class="month">${month}</span></div>
          <button class="holiday-action-btn ${isSaved ? 'saved' : ''}" data-action="save" data-id="${id}">
            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <h3>${h.localName}</h3>
        <p class="holiday-name">${h.name}</p>
        <div class="holiday-card-footer">
          <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${weekday}</span>
          <span class="holiday-type-badge">${h.types && h.types[0] ? h.types[0] : 'Public'}</span>
        </div>
      `;
      
      const saveBtn = card.querySelector('[data-action="save"]');
      saveBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('save-plan-item', {
          detail: {
            item: {
              id,
              type: 'holiday',
              title: h.localName,
              subtitle: h.name,
              date: h.date,
              day,
              month,
              weekday,
              holidayType: h.types && h.types[0] ? h.types[0] : 'Public'
            },
            button: saveBtn
          }
        }));
      });

      this.content.appendChild(card);
    });
  }
}

// --- Events View ---
class EventsView extends View {
  constructor(state, apiService) {
    super('events-view', state, apiService);
    this.content = document.getElementById('events-content');
    this.selectionHeader = this.element ? this.element.querySelector('.view-header-selection') : null;
    this.headerDesc = this.element ? this.element.querySelector('.view-header-content p') : null;
  }

  render(events) {
    if (!this.content) return;
    const { selectedCountryData, selectedCity } = this.state.get();
    
    if (this.headerDesc) {
      this.headerDesc.textContent = `Discover concerts, sports, theatre and more in ${selectedCity || 'your destination'}`;
    }

    if (this.selectionHeader && selectedCountryData) {
      this.selectionHeader.innerHTML = `
        <div class="current-selection-badge">
          <img src="${selectedCountryData.flagUrl}" alt="${selectedCountryData.name}" class="selection-flag">
          <span>${selectedCountryData.name}</span>
          <span class="selection-city">• ${selectedCity}</span>
        </div>
      `;
    }

    let displayEvents = events || [];
    if (displayEvents.length === 0) {
      displayEvents = this.generateMockEvents(selectedCity);
    }

    this.content.innerHTML = '';
    displayEvents.forEach(ev => {
      const isSaved = this.state.isItemSaved(ev.id);
      const card = document.createElement('div');
      card.className = 'event-card';
      card.innerHTML = `
        <div class="event-card-image">
          <img src="${ev.imageUrl}" alt="${ev.title}">
          <span class="event-card-category">${ev.category}</span>
          <button class="event-card-save ${isSaved ? 'saved' : ''}" data-action="save" data-id="${ev.id}">
            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <div class="event-card-body">
          <h3>${ev.title}</h3>
          <div class="event-card-info">
            <div><i class="fa-regular fa-calendar"></i> ${ev.date} at ${ev.time}</div>
            <div><i class="fa-solid fa-location-dot"></i> ${ev.venue}, ${ev.city}</div>
          </div>
          <div class="event-card-footer">
            <button class="btn-event ${isSaved ? 'saved' : ''}" data-action="save-btn" data-id="${ev.id}">
              <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${isSaved ? 'Saved' : 'Save'}
            </button>
            <a href="${ev.ticketUrl}" target="_blank" class="btn-buy-ticket"><i class="fa-solid fa-ticket"></i> Buy Tickets</a>
          </div>
        </div>
      `;
      
      const saveBtn = card.querySelector('[data-action="save"]');
      const saveTextBtn = card.querySelector('[data-action="save-btn"]');
      
      const handleSave = () => {
        window.dispatchEvent(new CustomEvent('save-plan-item', {
          detail: { item: ev, button: saveBtn, textButton: saveTextBtn }
        }));
      };

      saveBtn.addEventListener('click', handleSave);
      saveTextBtn.addEventListener('click', handleSave);
      this.content.appendChild(card);
    });
  }

  generateMockEvents(city) {
    const { selectedYear } = this.state.get();
    
    // Generate varying dates and venues based on city name length
    const len = city.length;
    const day1 = (len * 3) % 28 + 1;
    const day2 = (len * 7) % 28 + 1;
    const day3 = (len * 11) % 28 + 1;
    
    const month1 = String((len * 2) % 12 + 1).padStart(2, '0');
    const month2 = String((len * 5) % 12 + 1).padStart(2, '0');
    const month3 = String((len * 9) % 12 + 1).padStart(2, '0');

    // Unsplash images for varying categories to look premium
    const musicImages = [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=200&fit=crop'
    ];
    
    const sportsImages = [
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=200&fit=crop'
    ];
    
    const artsImages = [
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=200&fit=crop'
    ];

    const imgMusic = musicImages[len % musicImages.length];
    const imgSports = sportsImages[len % sportsImages.length];
    const imgArts = artsImages[len % artsImages.length];

    return [
      {
        id: `mock-event-1-${city.toLowerCase()}-${selectedYear}`,
        title: `${city} International Music Festival`,
        type: 'event',
        category: 'Music',
        date: `${selectedYear}-${month1}-${String(day1).padStart(2, '0')}`,
        time: '19:30',
        venue: `${city} Opera Arena`,
        city,
        imageUrl: imgMusic,
        ticketUrl: 'https://www.ticketmaster.com'
      },
      {
        id: `mock-event-2-${city.toLowerCase()}-${selectedYear}`,
        title: `${city} Athletic Cup Finals`,
        type: 'event',
        category: 'Sports',
        date: `${selectedYear}-${month2}-${String(day2).padStart(2, '0')}`,
        time: '17:00',
        venue: `${city} Memorial Stadium`,
        city,
        imageUrl: imgSports,
        ticketUrl: 'https://www.ticketmaster.com'
      },
      {
        id: `mock-event-3-${city.toLowerCase()}-${selectedYear}`,
        title: `Broadway Drama & Art Expo in ${city}`,
        type: 'event',
        category: 'Arts',
        date: `${selectedYear}-${month3}-${String(day3).padStart(2, '0')}`,
        time: '20:30',
        venue: `${city} Royal Theatre`,
        city,
        imageUrl: imgArts,
        ticketUrl: 'https://www.ticketmaster.com'
      }
    ];
  }
}

// --- Weather View ---
class WeatherView extends View {
  constructor(state, apiService) {
    super('weather-view', state, apiService);
    this.content = document.getElementById('weather-content');
    this.selectionHeader = this.element ? this.element.querySelector('.view-header-selection') : null;
    this.headerDesc = this.element ? this.element.querySelector('.view-header-content p') : null;
  }

  getWeatherInfo(code) {
    const mapping = {
      0: { text: 'Clear Sky', icon: 'fa-sun', heroClass: 'weather-sunny' },
      1: { text: 'Mainly Clear', icon: 'fa-cloud-sun', heroClass: 'weather-sunny' },
      2: { text: 'Partly Cloudy', icon: 'fa-cloud-sun', heroClass: 'weather-cloudy' },
      3: { text: 'Overcast', icon: 'fa-cloud', heroClass: 'weather-cloudy' },
      45: { text: 'Foggy', icon: 'fa-smog', heroClass: 'weather-cloudy' },
      48: { text: 'Rime Fog', icon: 'fa-smog', heroClass: 'weather-cloudy' },
      51: { text: 'Light Drizzle', icon: 'fa-cloud-rain', heroClass: 'weather-rainy' },
      53: { text: 'Moderate Drizzle', icon: 'fa-cloud-rain', heroClass: 'weather-rainy' },
      55: { text: 'Dense Drizzle', icon: 'fa-cloud-rain', heroClass: 'weather-rainy' },
      61: { text: 'Slight Rain', icon: 'fa-cloud-showers-heavy', heroClass: 'weather-rainy' },
      63: { text: 'Moderate Rain', icon: 'fa-cloud-showers-heavy', heroClass: 'weather-rainy' },
      65: { text: 'Heavy Rain', icon: 'fa-cloud-showers-heavy', heroClass: 'weather-rainy' },
      71: { text: 'Light Snowfall', icon: 'fa-snowflake', heroClass: 'weather-stormy' },
      73: { text: 'Moderate Snowfall', icon: 'fa-snowflake', heroClass: 'weather-stormy' },
      75: { text: 'Heavy Snowfall', icon: 'fa-snowflake', heroClass: 'weather-stormy' },
      95: { text: 'Thunderstorm', icon: 'fa-cloud-bolt', heroClass: 'weather-stormy' }
    };
    return mapping[code] || { text: 'Varying Conditions', icon: 'fa-cloud-sun', heroClass: 'weather-cloudy' };
  }

  render(weather) {
    if (!this.content) return;
    const { selectedCountryData, selectedCity } = this.state.get();
    
    if (this.headerDesc) {
      this.headerDesc.textContent = `Check 7-day weather forecasts for ${selectedCity || 'your destination'}`;
    }

    if (this.selectionHeader && selectedCountryData) {
      this.selectionHeader.innerHTML = `
        <div class="current-selection-badge">
          <img src="${selectedCountryData.flagUrl}" alt="${selectedCountryData.name}" class="selection-flag">
          <span>${selectedCountryData.name}</span>
          <span class="selection-city">• ${selectedCity}</span>
        </div>
      `;
    }

    if (!weather || !weather.current) {
      this.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-cloud-sun"></i></div>
          <h3>Weather data not loaded</h3>
          <p>Explore destination from dashboard first.</p>
        </div>
      `;
      return;
    }

    const current = weather.current;
    const weatherInfo = this.getWeatherInfo(current.weather_code);
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);
    const maxTemp = Math.round(weather.daily.temperature_2m_max[0]);
    const minTemp = Math.round(weather.daily.temperature_2m_min[0]);
    const humidity = current.relative_humidity_2m;
    const wind = Math.round(current.wind_speed_10m);
    const uv = weather.daily.uv_index_max[0] || 'N/A';
    const precipChance = weather.daily.precipitation_probability_max[0] || 0;

    this.content.innerHTML = `
      <div class="weather-hero-card ${weatherInfo.heroClass}">
        <div class="weather-location">
          <i class="fa-solid fa-location-dot"></i>
          <span>${selectedCity}</span>
          <span class="weather-time">${dateFormatted}</span>
        </div>
        <div class="weather-hero-main">
          <div class="weather-hero-left">
            <div class="weather-hero-icon"><i class="fa-solid ${weatherInfo.icon}"></i></div>
            <div class="weather-hero-temp">
              <span class="temp-value">${temp}</span>
              <span class="temp-unit">°C</span>
            </div>
          </div>
          <div class="weather-hero-right">
            <div class="weather-condition">${weatherInfo.text}</div>
            <div class="weather-feels">Feels like ${feels}°C</div>
            <div class="weather-high-low">
              <span class="high"><i class="fa-solid fa-arrow-up"></i> ${maxTemp}°</span>
              <span class="low"><i class="fa-solid fa-arrow-down"></i> ${minTemp}°</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="weather-details-grid">
        <div class="weather-detail-card">
          <div class="detail-icon humidity"><i class="fa-solid fa-droplet"></i></div>
          <div class="detail-info">
            <span class="detail-label">Humidity</span>
            <span class="detail-value">${humidity}%</span>
          </div>
        </div>
        <div class="weather-detail-card">
          <div class="detail-icon wind"><i class="fa-solid fa-wind"></i></div>
          <div class="detail-info">
            <span class="detail-label">Wind</span>
            <span class="detail-value">${wind} km/h</span>
          </div>
        </div>
        <div class="weather-detail-card">
          <div class="detail-icon uv"><i class="fa-solid fa-sun"></i></div>
          <div class="detail-info">
            <span class="detail-label">UV Index</span>
            <span class="detail-value">${uv}</span>
          </div>
        </div>
        ${precipChance > 15 ? `
        <div class="weather-detail-card">
          <div class="detail-icon precip"><i class="fa-solid fa-cloud-rain"></i></div>
          <div class="detail-info">
            <span class="detail-label">Precipitation</span>
            <span class="detail-value">${precipChance}%</span>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="weather-section">
        <h3 class="weather-section-title"><i class="fa-solid fa-clock"></i> Hourly Forecast</h3>
        <div class="hourly-scroll">
          ${weather.hourly.time.slice(0, 12).map((timeVal, idx) => {
            const hDate = new Date(timeVal);
            let hr = hDate.getHours();
            const ampm = hr >= 12 ? 'PM' : 'AM';
            hr = hr % 12 || 12;
            const hourStr = idx === 0 ? 'Now' : `${hr} ${ampm}`;
            const hourlyCode = weather.hourly.weather_code[idx];
            const hourlyInfo = this.getWeatherInfo(hourlyCode);
            const hourlyTemp = Math.round(weather.hourly.temperature_2m[idx]);
            const hourlyPrecip = weather.hourly.precipitation_probability[idx] || 0;
            
            return `
              <div class="hourly-item ${idx === 0 ? 'now' : ''}">
                <span class="hourly-time">${hourStr}</span>
                <div class="hourly-icon"><i class="fa-solid ${hourlyInfo.icon}"></i></div>
                <span class="hourly-temp">${hourlyTemp}°</span>
                ${hourlyPrecip > 10 ? `<span class="hourly-precip"><i class="fa-solid fa-droplet"></i> ${hourlyPrecip}%</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="weather-section">
        <h3 class="weather-section-title"><i class="fa-solid fa-calendar-week"></i> 7-Day Forecast</h3>
        <div class="forecast-list">
          ${weather.daily.time.map((timeVal, idx) => {
            const fDate = new Date(timeVal);
            const dayLabel = idx === 0 ? 'Today' : fDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dayDate = fDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const dailyCode = weather.daily.weather_code[idx];
            const dailyInfo = this.getWeatherInfo(dailyCode);
            const dMax = Math.round(weather.daily.temperature_2m_max[idx]);
            const dMin = Math.round(weather.daily.temperature_2m_min[idx]);
            const dPrecip = weather.daily.precipitation_probability_max[idx] || 0;

            return `
              <div class="forecast-day ${idx === 0 ? 'today' : ''}">
                <div class="forecast-day-name"><span class="day-label">${dayLabel}</span><span class="day-date">${dayDate}</span></div>
                <div class="forecast-icon"><i class="fa-solid ${dailyInfo.icon}"></i></div>
                <div class="forecast-temps"><span class="temp-max">${dMax}°</span><span class="temp-min">${dMin}°</span></div>
                ${dPrecip > 15 ? `
                <div class="forecast-precip">
                  <i class="fa-solid fa-cloud-rain"></i><span>${dPrecip}%</span>
                </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}

// --- Long Weekends View ---
class LongWeekendsView extends View {
  constructor(state, apiService) {
    super('long-weekends-view', state, apiService);
    this.content = document.getElementById('lw-content');
    this.selectionHeader = this.element ? this.element.querySelector('.view-header-selection') : null;
    this.headerDesc = this.element ? this.element.querySelector('.view-header-content p') : null;
  }

  render(weekends) {
    if (!this.content) return;
    const { selectedCountryData, selectedYear } = this.state.get();
    
    const countryName = selectedCountryData ? selectedCountryData.name : 'your destination';
    if (this.headerDesc) {
      this.headerDesc.textContent = `Find holidays near weekends for ${countryName} - perfect for planning mini-trips!`;
    }

    if (this.selectionHeader && selectedCountryData) {
      this.selectionHeader.innerHTML = `
        <div class="current-selection-badge">
          <img src="${selectedCountryData.flagUrl}" alt="${selectedCountryData.name}" class="selection-flag">
          <span>${selectedCountryData.name}</span>
          <span class="selection-year">${selectedYear}</span>
        </div>
      `;
    }

    let displayWeekends = weekends || [];
    if (displayWeekends.length === 0) {
      displayWeekends = this.simulateLongWeekends();
    }

    if (displayWeekends.length === 0) {
      this.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-umbrella-beach"></i></div>
          <h3>No long weekends calculated</h3>
          <p>Try exploring another country/year choice.</p>
        </div>
      `;
      return;
    }

    this.content.innerHTML = '';
    displayWeekends.forEach((w, index) => {
      const id = `lw-${w.startDate}-${index}`;
      const isSaved = this.state.isItemSaved(id);
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      const dateString = `${start.toLocaleString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleString('en-US', { month: 'short', day: 'numeric' })}, ${selectedYear}`;
      const visualDays = this.getVisualDays(start, end);

      const card = document.createElement('div');
      card.className = 'lw-card';
      card.innerHTML = `
        <div class="lw-card-header">
          <span class="lw-badge"><i class="fa-solid fa-calendar-days"></i> ${w.dayCount} Days</span>
          <button class="holiday-action-btn ${isSaved ? 'saved' : ''}" data-action="save" data-id="${id}">
            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
        </div>
        <h3>Long Weekend Opportunity</h3>
        <div class="lw-dates"><i class="fa-regular fa-calendar"></i> ${dateString}</div>
        <div class="lw-info-box ${w.needBridgeDay ? 'warning' : 'success'}">
          <i class="fa-solid ${w.needBridgeDay ? 'fa-info-circle' : 'fa-check-circle'}"></i> 
          ${w.needBridgeDay ? 'Requires taking a bridge day off' : 'No extra days off needed!'}
        </div>
        <div class="lw-days-visual">
          ${visualDays.map(d => `
            <div class="lw-day ${d.isWeekend ? 'weekend' : ''}">
              <span class="name">${d.name}</span>
              <span class="num">${d.num}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      const saveBtn = card.querySelector('[data-action="save"]');
      saveBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('save-plan-item', {
          detail: {
            item: {
              id,
              type: 'longweekend',
              title: `Long Weekend (${w.dayCount} Days)`,
              subtitle: dateString,
              date: w.startDate,
              dayCount: w.dayCount,
              startDate: w.startDate,
              endDate: w.endDate,
              needBridgeDay: w.needBridgeDay
            },
            button: saveBtn
          }
        }));
      });

      this.content.appendChild(card);
    });
  }

  getVisualDays(start, end) {
    const list = [];
    let current = new Date(start);
    while (current <= end) {
      const dayIndex = current.getDay();
      list.push({
        name: current.toLocaleString('en-US', { weekday: 'short' }),
        num: current.getDate(),
        isWeekend: this.state.get().selectedCountry === 'EG' 
          ? (dayIndex === 5 || dayIndex === 6) 
          : (dayIndex === 0 || dayIndex === 6)
      });
      current.setDate(current.getDate() + 1);
    }
    return list;
  }

  simulateLongWeekends() {
    const holidays = this.state.get().holidaysData || [];
    if (holidays.length === 0) return [];
    
    const results = [];
    holidays.slice(0, 5).forEach(h => {
      const hDate = new Date(h.date);
      const day = hDate.getDay();
      let startDate, endDate, needBridgeDay = false, dayCount = 3;
      
      if (day === 4) {
        startDate = h.date;
        const tempEnd = new Date(hDate);
        tempEnd.setDate(tempEnd.getDate() + 2);
        endDate = tempEnd.toISOString().split('T')[0];
      } else if (day === 0) {
        const tempStart = new Date(hDate);
        tempStart.setDate(tempStart.getDate() - 2);
        startDate = tempStart.toISOString().split('T')[0];
        endDate = h.date;
      } else if (day === 2) {
        const tempStart = new Date(hDate);
        tempStart.setDate(tempStart.getDate() - 3);
        startDate = tempStart.toISOString().split('T')[0];
        endDate = h.date;
        needBridgeDay = true;
        dayCount = 4;
      } else {
        startDate = h.date;
        const tempEnd = new Date(hDate);
        tempEnd.setDate(tempEnd.getDate() + 2);
        endDate = tempEnd.toISOString().split('T')[0];
      }

      results.push({ startDate, endDate, dayCount, needBridgeDay });
    });
    return results;
  }
}

// --- Currency View ---
class CurrencyView extends View {
  constructor(state, apiService) {
    super('currency-view', state, apiService);
    this.amountInput = document.getElementById('currency-amount');
    this.fromSelect = document.getElementById('currency-from');
    this.toSelect = document.getElementById('currency-to');
    this.resultContainer = document.getElementById('currency-result');
    this.swapBtn = document.getElementById('swap-currencies-btn');
    this.popularGrid = document.getElementById('popular-currencies');
    
    if (this.swapBtn) {
      this.swapBtn.addEventListener('click', () => {
        const temp = this.fromSelect.value;
        this.fromSelect.value = this.toSelect.value;
        this.toSelect.value = temp;
        this.performConversion();
      });
    }
  }

  populateCurrencyDropdowns(rates, targetCurrency = '') {
    if (!this.fromSelect || !this.toSelect) return;
    const fromVal = 'USD';
    const toVal = targetCurrency || this.toSelect.value || 'EGP';
    
    const names = {
      USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', EGP: 'Egyptian Pound',
      SAR: 'Saudi Riyal', AED: 'UAE Dirham', CAD: 'Canadian Dollar', JPY: 'Japanese Yen',
      INR: 'Indian Rupee'
    };

    const currencyCodes = Object.keys(rates);
    const populate = (select, activeVal) => {
      select.innerHTML = '';
      currencyCodes.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${names[code] || code}`;
        if (code === activeVal) option.selected = true;
        select.appendChild(option);
      });
    };

    populate(this.fromSelect, fromVal);
    populate(this.toSelect, toVal);
    this.renderPopularGrid(rates);
  }

  renderPopularGrid(rates) {
    if (!this.popularGrid) return;
    const popular = [
      { code: 'EUR', name: 'Euro', flag: 'eu' },
      { code: 'GBP', name: 'British Pound', flag: 'gb' },
      { code: 'EGP', name: 'Egyptian Pound', flag: 'eg' },
      { code: 'AED', name: 'UAE Dirham', flag: 'ae' },
      { code: 'SAR', name: 'Saudi Riyal', flag: 'sa' },
      { code: 'JPY', name: 'Japanese Yen', flag: 'jp' },
      { code: 'CAD', name: 'Canadian Dollar', flag: 'ca' },
      { code: 'INR', name: 'Indian Rupee', flag: 'in' }
    ];

    this.popularGrid.innerHTML = '';
    popular.forEach(c => {
      const rateVal = rates[c.code] ? rates[c.code].toFixed(4) : 'N/A';
      const card = document.createElement('div');
      card.className = 'popular-currency-card';
      card.innerHTML = `
        <img src="https://flagcdn.com/w40/${c.flag}.png" alt="${c.code}" class="flag">
        <div class="info"><div class="code">${c.code}</div><div class="name">${c.name}</div></div>
        <div class="rate">${rateVal}</div>
      `;
      this.popularGrid.appendChild(card);
    });
  }

  performConversion() {
    const { exchangeRates } = this.state.get();
    if (!exchangeRates || !this.resultContainer) return;
    
    const amount = parseFloat(this.amountInput.value) || 0;
    const from = this.fromSelect.value;
    const to = this.toSelect.value;
    const baseRates = exchangeRates.conversion_rates;
    if (!baseRates) return;
    
    const fromRate = baseRates[from] || 1;
    const toRate = baseRates[to] || 1;
    const targetAmount = (amount / fromRate) * toRate;
    const unitRate = (1 / fromRate) * toRate;

    this.resultContainer.innerHTML = `
      <div class="conversion-display">
        <div class="conversion-from">
          <span class="amount">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span class="currency-code">${from}</span>
        </div>
        <div class="conversion-equals"><i class="fa-solid fa-equals"></i></div>
        <div class="conversion-to">
          <span class="amount">${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span class="currency-code">${to}</span>
        </div>
      </div>
      <div class="exchange-rate-info">
        <p>1 ${from} = ${unitRate.toFixed(4)} ${to}</p>
        <small>Last updated: ${new Date(exchangeRates.time_last_update_utc).toLocaleDateString()}</small>
      </div>
    `;
  }
}

// --- Sun Times View ---
class SunTimesView extends View {
  constructor(state, apiService) {
    super('sun-times-view', state, apiService);
    this.content = document.getElementById('sun-times-content');
    this.selectionHeader = this.element ? this.element.querySelector('.view-header-selection') : null;
    this.headerDesc = this.element ? this.element.querySelector('.view-header-content p') : null;
  }

  render(sun) {
    if (!this.content) return;
    const { selectedCountryData, selectedCity } = this.state.get();
    
    if (this.headerDesc) {
      this.headerDesc.textContent = `Plan your activities around golden hour in ${selectedCity || 'your destination'} - perfect for photographers`;
    }

    if (this.selectionHeader && selectedCountryData) {
      this.selectionHeader.innerHTML = `
        <div class="current-selection-badge">
          <img src="${selectedCountryData.flagUrl}" alt="${selectedCountryData.name}" class="selection-flag">
          <span>${selectedCountryData.name}</span>
          <span class="selection-city">• ${selectedCity}</span>
        </div>
      `;
    }

    if (!sun) {
      this.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-sun"></i></div>
          <h3>Sun Times data not loaded</h3>
          <p>Explore statistics from the dashboard first.</p>
        </div>
      `;
      return;
    }

    const formatSunTime = (isoString) => {
      if (!isoString) return 'N/A';
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    };

    const dawn = formatSunTime(sun.civil_twilight_begin);
    const sunrise = formatSunTime(sun.sunrise);
    const noon = formatSunTime(sun.solar_noon);
    const sunset = formatSunTime(sun.sunset);
    const dusk = formatSunTime(sun.civil_twilight_end);
    
    const totalSeconds = sun.day_length;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const dayLengthString = `${hours}h ${minutes}m`;
    const dayRatio = ((totalSeconds / 86400) * 100).toFixed(1);
    const darkHours = 24 - (totalSeconds / 3600);
    const darkRatioString = `${Math.floor(darkHours)}h ${Math.round((darkHours % 1) * 60)}m`;

    const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    this.content.innerHTML = `
      <div class="sun-main-card">
        <div class="sun-main-header">
          <div class="sun-location">
            <h2><i class="fa-solid fa-location-dot"></i> ${selectedCity}</h2>
            <p>Sun times for your selected location</p>
          </div>
          <div class="sun-date-display">
            <div class="date">${todayDate}</div>
            <div class="day">${todayDay}</div>
          </div>
        </div>
        
        <div class="sun-times-grid">
          <div class="sun-time-card dawn">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Dawn</div>
            <div class="time">${dawn}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card sunrise">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunrise</div>
            <div class="time">${sunrise}</div>
            <div class="sub-label">Golden Hour Start</div>
          </div>
          <div class="sun-time-card noon">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Solar Noon</div>
            <div class="time">${noon}</div>
            <div class="sub-label">Sun at Highest</div>
          </div>
          <div class="sun-time-card sunset">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunset</div>
            <div class="time">${sunset}</div>
            <div class="sub-label">Golden Hour End</div>
          </div>
          <div class="sun-time-card dusk">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Dusk</div>
            <div class="time">${dusk}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card daylight">
            <div class="icon"><i class="fa-solid fa-hourglass-half"></i></div>
            <div class="label">Day Length</div>
            <div class="time">${dayLengthString}</div>
            <div class="sub-label">Total Daylight</div>
          </div>
        </div>
      </div>
      
      <div class="day-length-card">
        <h3><i class="fa-solid fa-chart-pie"></i> Daylight Distribution</h3>
        <div class="day-progress">
          <div class="day-progress-bar">
            <div class="day-progress-fill" style="width: ${dayRatio}%"></div>
          </div>
        </div>
        <div class="day-length-stats">
          <div class="day-stat">
            <div class="value">${dayLengthString}</div>
            <div class="label">Daylight</div>
          </div>
          <div class="day-stat">
            <div class="value">${dayRatio}%</div>
            <div class="label">of 24 Hours</div>
          </div>
          <div class="day-stat">
            <div class="value">${darkRatioString}</div>
            <div class="label">Darkness</div>
          </div>
        </div>
      </div>
    `;
  }
}

// --- My Plans View ---
class MyPlansView extends View {
  constructor(state, apiService) {
    super('my-plans-view', state, apiService);
    this.content = document.getElementById('plans-content');
    
    this.allCount = document.getElementById('filter-all-count');
    this.holidayCount = document.getElementById('filter-holiday-count');
    this.eventCount = document.getElementById('filter-event-count');
    this.lwCount = document.getElementById('filter-lw-count');
    
    this.clearAllBtn = document.getElementById('clear-all-plans-btn');
    this.filterButtons = document.querySelectorAll('.plan-filter');
    this.activeFilter = 'all';

    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this.renderPlans();
      });
    });

    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('clear-all-plans'));
      });
    }
  }

  render(plans) {
    this.renderPlans();
  }

  renderPlans() {
    if (!this.content) return;
    const { savedPlans } = this.state.get();
    
    const hCount = savedPlans.filter(p => p.type === 'holiday').length;
    const eCount = savedPlans.filter(p => p.type === 'event').length;
    const lCount = savedPlans.filter(p => p.type === 'longweekend').length;
    
    if (this.allCount) this.allCount.textContent = savedPlans.length;
    if (this.holidayCount) this.holidayCount.textContent = hCount;
    if (this.eventCount) this.eventCount.textContent = eCount;
    if (this.lwCount) this.lwCount.textContent = lCount;

    const filtered = savedPlans.filter(p => {
      if (this.activeFilter === 'all') return true;
      return p.type === this.activeFilter;
    });

    if (filtered.length === 0) {
      this.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-heart-crack"></i></div>
          <h3>No Saved Plans in this list</h3>
          <p>Go explore the discovery sections and add items to see them here!</p>
          <button class="btn-primary" id="plans-explore-shortcut">
            <i class="fa-solid fa-compass"></i> Start Exploring
          </button>
        </div>
      `;
      
      const exploreShortcut = document.getElementById('plans-explore-shortcut');
      if (exploreShortcut) {
        exploreShortcut.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('view-navigate', { detail: 'dashboard' }));
        });
      }
      return;
    }

    this.content.innerHTML = '';
    filtered.forEach(p => {
      const card = document.createElement('div');
      
      if (p.type === 'holiday') {
        card.className = 'holiday-card';
        card.innerHTML = `
          <div class="holiday-card-header">
            <div class="holiday-date-box"><span class="day">${p.day || ''}</span><span class="month">${p.month || ''}</span></div>
            <button class="holiday-action-btn delete-btn" data-action="delete" data-id="${p.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <h3>${p.title}</h3>
          <p class="holiday-name">${p.subtitle || ''}</p>
          <div class="holiday-card-footer">
            <span class="holiday-day-badge"><i class="fa-regular fa-calendar"></i> ${p.weekday || ''}</span>
            <span class="holiday-type-badge">${p.holidayType || 'Public'}</span>
          </div>
        `;
      } 
      else if (p.type === 'event') {
        card.className = 'event-card';
        card.innerHTML = `
          <div class="event-card-image">
            <img src="${p.imageUrl}" alt="${p.title}">
            <span class="event-card-category">${p.category}</span>
            <button class="event-card-save delete-btn" data-action="delete" data-id="${p.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <div class="event-card-body">
            <h3>${p.title}</h3>
            <div class="event-card-info">
              <div><i class="fa-regular fa-calendar"></i> ${p.date} at ${p.time}</div>
              <div><i class="fa-solid fa-location-dot"></i> ${p.venue}, ${p.city}</div>
            </div>
            <div class="event-card-footer">
              <button class="btn-event delete-btn-text" data-action="delete-btn" data-id="${p.id}">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
              <a href="${p.ticketUrl}" target="_blank" class="btn-buy-ticket"><i class="fa-solid fa-ticket"></i> Tickets</a>
            </div>
          </div>
        `;
      } 
      else if (p.type === 'longweekend') {
        card.className = 'lw-card';
        card.innerHTML = `
          <div class="lw-card-header">
            <span class="lw-badge"><i class="fa-solid fa-calendar-days"></i> ${p.dayCount} Days</span>
            <button class="holiday-action-btn delete-btn" data-action="delete" data-id="${p.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <h3>${p.title}</h3>
          <div class="lw-dates"><i class="fa-regular fa-calendar"></i> ${p.subtitle}</div>
          <div class="lw-info-box ${p.needBridgeDay ? 'warning' : 'success'}">
            <i class="fa-solid ${p.needBridgeDay ? 'fa-info-circle' : 'fa-check-circle'}"></i> 
            ${p.needBridgeDay ? 'Requires a bridge day' : 'No extra days off!'}
          </div>
        `;
      }

      const delIcon = card.querySelector('[data-action="delete"]');
      const delText = card.querySelector('[data-action="delete-btn"]');
      const fireDelete = () => {
        window.dispatchEvent(new CustomEvent('delete-plan-item', { detail: p.id }));
      };
      
      if (delIcon) delIcon.addEventListener('click', fireDelete);
      if (delText) delText.addEventListener('click', fireDelete);
      this.content.appendChild(card);
    });
  }
}

// ============================================================================
// 6. MAIN CONTROLLER
// ============================================================================
class AppController {
  constructor() {
    this.state = new AppState();
    this.api = new ApiService();
    
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingText = document.getElementById('loading-text');
    this.exploreBtn = document.getElementById('global-search-btn');
    this.clearSelectionBtn = document.getElementById('clear-selection-btn');
    this.selectedDestinationPanel = document.getElementById('selected-destination');
    
    this.statSaved = document.getElementById('stat-saved');
    this.statHolidays = document.getElementById('stat-holidays');
    
    this.sidebarNav = document.querySelector('.sidebar-nav');
    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.plansBadge = document.getElementById('plans-count');
    
    this.router = new Router((viewName) => this.handleViewChange(viewName));

    this.views = {
      'dashboard': new DashboardView(this.state, this.api),
      'holidays': new HolidaysView(this.state, this.api),
      'events': new EventsView(this.state, this.api),
      'weather': new WeatherView(this.state, this.api),
      'long-weekends': new LongWeekendsView(this.state, this.api),
      'currency': new CurrencyView(this.state, this.api),
      'sun-times': new SunTimesView(this.state, this.api),
      'my-plans': new MyPlansView(this.state, this.api)
    };
  }

  async init() {
    this.startHeaderClock();
    this.setupEventListeners();
    this.router.init();

    this.showLoader('Configuring application...');
    try {
      const countries = await this.api.getAvailableCountries();
      this.views.dashboard.populateCountries(countries);
      await this.exploreDestination('EG', 'Cairo', 2026, true);
    } catch (e) {
      console.error('Initial configuration loading failed', e);
      this.showToast('error', 'Configuration Failed', 'Could not load country listing from API.');
    } finally {
      this.hideLoader();
    }
  }

  startHeaderClock() {
    const clockEl = document.getElementById('current-datetime');
    if (!clockEl) return;
    const updateTime = () => {
      clockEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    };
    updateTime();
    setInterval(updateTime, 60000);
  }

  showToast(icon, title, text = '', forceWhitesmoke = false) {
    const toastBg = forceWhitesmoke ? '#f5f5f5' : 'var(--primary-900)';
    const toastColor = forceWhitesmoke ? '#334155' : '#ffffff';
    const progressColor = forceWhitesmoke ? 'var(--primary-500)' : '#ffffff';

    Swal.fire({
      icon: icon, title: title, text: text,
      toast: true, position: 'bottom-end', showConfirmButton: false,
      timer: 3500, timerProgressBar: true,
      background: toastBg, color: toastColor,
      iconColor: icon === 'success' ? '#10b981' : (icon === 'error' ? '#ef4444' : '#f59e0b'),
      didOpen: (toast) => {
        toast.style.borderRadius = '12px';
        const progressEl = toast.querySelector('.swal2-timer-progress-bar');
        if (progressEl) {
          progressEl.style.backgroundColor = progressColor;
        }

        if (forceWhitesmoke) {
          toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.05)';
          toast.style.border = '1px solid rgba(0, 0, 0, 0.08)';
        } else {
          toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
          toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        }
      }
    });
  }

  showLoader(text = 'Loading...') {
    if (this.loadingOverlay) {
      this.loadingText.textContent = text;
      this.loadingOverlay.classList.remove('hidden');
    }
  }

  hideLoader() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
  }

  setupEventListeners() {
    if (this.sidebarNav) {
      this.sidebarNav.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;
        e.preventDefault();
        const viewName = item.dataset.view;
        if (viewName) {
          this.closeMobileSidebar();
          this.router.navigate(viewName);
        }
      });
    }

    if (this.mobileMenuBtn) {
      this.mobileMenuBtn.addEventListener('click', () => {
        this.sidebar.classList.toggle('open');
        this.sidebarOverlay.classList.toggle('hidden');
      });
    }
    
    if (this.sidebarOverlay) {
      this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
    }

    if (this.exploreBtn) {
      this.exploreBtn.addEventListener('click', async () => {
        const countryCode = document.getElementById('global-country').value;
        const city = document.getElementById('global-city').value;
        const year = parseInt(document.getElementById('global-year').value);
        
        if (!countryCode) {
          this.showToast('error', 'Selection Required', 'Please choose a destination country.');
          return;
        }

        this.showLoader(`Exploring ${city || 'Capital'}...`);
        try {
          await this.exploreDestination(countryCode, city, year);
        } catch (e) {
          this.showToast('error', 'Exploration Failed', 'Could not load data for selected destination.');
        } finally {
          this.hideLoader();
        }
      });
    }

    // Dynamic Country Selection Change Listener
    const countrySelect = document.getElementById('global-country');
    if (countrySelect) {
      countrySelect.addEventListener('change', async () => {
        const countryCode = countrySelect.value;
        if (!countryCode) return;
        
        const citySelect = document.getElementById('global-city');
        if (citySelect) {
          citySelect.innerHTML = '<option value="">Loading cities...</option>';
        }
        
        try {
          const countryData = await this.api.getCountryDetails(countryCode);
          this.views.dashboard.populateCities(countryData.capital);
        } catch (e) {
          console.error('Failed to dynamically update cities dropdown', e);
          if (citySelect) {
            citySelect.innerHTML = '<option value="">Error loading cities</option>';
          }
        }
      });
    }

    if (this.clearSelectionBtn) {
      this.clearSelectionBtn.addEventListener('click', () => {
        document.getElementById('global-country').value = '';
        document.getElementById('global-city').innerHTML = '<option value="">Select City</option>';
        document.getElementById('global-year').value = '2026';
        if (this.selectedDestinationPanel) this.selectedDestinationPanel.classList.add('hidden');
        
        // Clear destination in state
        this.state.setState({
          selectedCountry: '',
          selectedCountryData: null,
          selectedCity: '',
          weatherData: null,
          eventsData: null,
          holidaysData: null,
          longWeekendsData: null,
          sunTimesData: null,
          exchangeRates: null
        });
        
        this.renderCurrentView(this.state.get().currentView);
        this.showToast('info', 'Filters Cleared', 'Destination filters have been reset.');
      });
    }

    window.addEventListener('save-plan-item', (e) => {
      const { item, button, textButton } = e.detail;
      const res = this.state.savePlan(item);
      
      if (res.success) {
        if (button) {
          button.classList.add('saved');
          const icon = button.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-heart';
        }
        if (textButton) {
          textButton.classList.add('saved');
          textButton.innerHTML = '<i class="fa-solid fa-heart"></i> Saved';
        }
        this.updatePlansBadgeCount();
        this.showToast('success', 'Plan Saved!', `"${item.title}" added to your saved plans.`);
      } else {
        this.showToast('info', 'Already Saved', res.message);
      }
    });

    window.addEventListener('delete-plan-item', (e) => {
      const id = e.detail;
      Swal.fire({
        title: 'Are you sure?',
        text: "Remove this plan from your trip itinerary?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger-500)',
        cancelButtonColor: 'var(--primary-500)',
        confirmButtonText: 'Yes, delete it!',
        background: '#f5f5f5',
        color: '#334155',
        didOpen: (popup) => {
          popup.style.borderRadius = '24px';
          popup.style.boxShadow = '0 20px 50px rgba(0,0,0,0.15), 0 1px 10px rgba(0,0,0,0.05)';
          popup.style.border = '1px solid rgba(0,0,0,0.08)';
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.state.deletePlan(id);
          this.updatePlansBadgeCount();
          if (this.state.get().currentView === 'my-plans') {
            this.views['my-plans'].renderPlans();
          }
          this.showToast('success', 'Deleted!', 'Plan removed successfully.', true);
        }
      });
    });

    window.addEventListener('clear-all-plans', () => {
      if (this.state.get().savedPlans.length === 0) return;
      Swal.fire({
        title: 'Clear All Plans?',
        text: "This will permanently delete all saved trip items!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: 'var(--danger-500)',
        cancelButtonColor: 'var(--primary-500)',
        confirmButtonText: 'Clear All',
        background: '#f5f5f5',
        color: '#334155',
        didOpen: (popup) => {
          popup.style.borderRadius = '24px';
          popup.style.boxShadow = '0 20px 50px rgba(0,0,0,0.15), 0 1px 10px rgba(0,0,0,0.05)';
          popup.style.border = '1px solid rgba(0,0,0,0.08)';
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.state.clearAllPlans();
          this.updatePlansBadgeCount();
          if (this.state.get().currentView === 'my-plans') {
            this.views['my-plans'].renderPlans();
          }
          this.showToast('success', 'Cleared!', 'All saved plans have been deleted.', true);
        }
      });
    });

    window.addEventListener('view-navigate', (e) => {
      const viewName = e.detail;
      this.router.navigate(viewName);
    });

    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      convertBtn.addEventListener('click', () => {
        this.views.currency.performConversion();
      });
    }

    const amountInput = document.getElementById('currency-amount');
    if (amountInput) {
      amountInput.addEventListener('input', () => {
        this.views.currency.performConversion();
      });
    }
  }

  closeMobileSidebar() {
    if (this.sidebar && this.sidebar.classList.contains('open')) {
      this.sidebar.classList.remove('open');
      this.sidebarOverlay.classList.add('hidden');
    }
  }

  updatePlansBadgeCount() {
    const count = this.state.get().savedPlans.length;
    if (this.plansBadge) {
      if (count > 0) {
        this.plansBadge.textContent = count;
        this.plansBadge.classList.remove('hidden');
      } else {
        this.plansBadge.classList.add('hidden');
      }
    }
  }

  async exploreDestination(countryCode, city, year, isInitial = false) {
    const countryData = await this.api.getCountryDetails(countryCode);
    const resolvedCity = city || countryData.capital;
    
    if (isInitial || !city) {
      this.views.dashboard.populateCities(countryData.capital, resolvedCity);
    }

    if (this.selectedDestinationPanel) {
      this.selectedDestinationPanel.classList.remove('hidden');
      const flagImg = document.getElementById('selected-country-flag');
      const nameTxt = document.getElementById('selected-country-name');
      const cityTxt = document.getElementById('selected-city-name');
      if (flagImg) flagImg.src = countryData.flagUrl;
      if (nameTxt) nameTxt.textContent = countryData.name;
      if (cityTxt) cityTxt.textContent = `• ${resolvedCity}`;
    }

    this.state.setState({
      selectedCountry: countryCode,
      selectedCountryData: countryData,
      selectedCity: resolvedCity,
      selectedYear: year
    });

    let lat = countryData.capitalLatLng[0];
    let lon = countryData.capitalLatLng[1];
    
    const cityCoords = {
      // Egypt
      'cairo': [30.0444, 31.2357],
      'alexandria': [31.2001, 29.9187],
      'sharm el sheikh': [27.9158, 34.3299],
      'giza': [30.0131, 31.2089],
      'luxor': [25.6872, 32.6396],
      // USA
      'washington': [38.9072, -77.0369],
      'washington d.c.': [38.9072, -77.0369],
      'new york': [40.7128, -74.0060],
      'los angeles': [34.0522, -118.2437],
      'chicago': [41.8781, -87.6298],
      'miami': [25.7617, -80.1918],
      'san francisco': [37.7749, -122.4194],
      // France
      'paris': [48.8566, 2.3522],
      'marseille': [43.2965, 5.3698],
      'lyon': [45.7640, 4.8357],
      'nice': [43.7102, 7.2620],
      'toulouse': [43.6047, 1.4442],
      // UK
      'london': [51.5074, -0.1278],
      'manchester': [53.4808, -2.2426],
      'birmingham': [52.4862, -1.8904],
      'edinburgh': [55.9533, -3.1883],
      // Italy
      'rome': [41.9028, 12.4964],
      'milan': [45.4642, 9.1900],
      'venice': [45.4408, 12.3155],
      'florence': [43.7696, 11.2558],
      // Spain
      'madrid': [40.4168, -3.7038],
      'barcelona': [41.3851, 2.1734],
      'seville': [37.3891, -5.9845],
      'valencia': [39.4699, -0.3763],
      // Germany
      'berlin': [52.5200, 13.4050],
      'munich': [48.1351, 11.5820],
      'frankfurt': [50.1109, 8.6821],
      'hamburg': [53.5511, 9.9937],
      // Japan
      'tokyo': [35.6762, 139.6503],
      'osaka': [34.6937, 135.5023],
      'kyoto': [35.0116, 135.7681],
      'yokohama': [35.4437, 139.6380],
      // Saudi Arabia
      'riyadh': [24.7136, 46.6753],
      'jeddah': [21.3256, 39.1868],
      'mecca': [21.3891, 39.8579],
      'medina': [24.5247, 39.5692],
      // UAE
      'abu dhabi': [24.4539, 54.3773],
      'dubai': [25.2048, 55.2708],
      'sharjah': [25.3463, 55.4209]
    };

    const cityKey = resolvedCity.toLowerCase().trim();
    if (cityCoords[cityKey]) {
      lat = cityCoords[cityKey][0];
      lon = cityCoords[cityKey][1];
    }

    const todayISO = new Date().toISOString().split('T')[0];

    const [holidays, weekends, weather, events, sunTimes, rates] = await Promise.allSettled([
      this.api.getPublicHolidays(year, countryCode),
      this.api.getLongWeekends(year, countryCode),
      this.api.getWeather(lat, lon),
      this.api.getEvents(resolvedCity, countryCode),
      this.api.getSunTimes(lat, lon, todayISO),
      this.api.getLatestRates(countryData.currencyCode || 'USD')
    ]);

    const updates = {};
    if (holidays.status === 'fulfilled') updates.holidaysData = holidays.value;
    if (weekends.status === 'fulfilled') updates.longWeekendsData = weekends.value;
    if (weather.status === 'fulfilled') updates.weatherData = weather.value;
    if (events.status === 'fulfilled') updates.eventsData = events.value;
    if (sunTimes.status === 'fulfilled') updates.sunTimesData = sunTimes.value;
    if (rates.status === 'fulfilled') updates.exchangeRates = rates.value;

    this.state.setState(updates);
    const currentView = this.state.get().currentView;
    this.renderCurrentView(currentView);

    if (!isInitial) {
      this.showToast('success', 'Destination Updated', `Welcome to ${resolvedCity}, ${countryData.name}!`);
    }
    this.updatePlansBadgeCount();
  }

  handleViewChange(viewName) {
    const navItems = this.sidebarNav.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    const titles = {
      'dashboard': { title: 'Dashboard', sub: 'Welcome back! Ready to plan your next adventure?' },
      'holidays': { title: 'Holidays Explorer', sub: 'Plan around public holidays and festivals.' },
      'events': { title: 'Events Finder', sub: 'Discover local concerts, sports, and theatrical events.' },
      'weather': { title: 'Weather Forecast', sub: 'Accurate 7-day weather expectations for your trip.' },
      'long-weekends': { title: 'Long Weekends Planner', sub: 'Find short holiday weekend opportunities.' },
      'currency': { title: 'Currency Converter', sub: 'Live exchange rate calculations.' },
      'sun-times': { title: 'Golden Hour Times', sub: 'Sunrise, sunset, and daylight distribution ratios.' },
      'my-plans': { title: 'My Itinerary Plans', sub: 'Manage saved public holidays, events, and trips.' }
    };

    if (pageTitle && titles[viewName]) {
      pageTitle.textContent = titles[viewName].title;
      pageSubtitle.textContent = titles[viewName].sub;
    }

    Object.keys(this.views).forEach(key => {
      if (key === viewName) {
        this.views[key].show();
      } else {
        this.views[key].hide();
      }
    });

    this.state.setState({ currentView: viewName });
    this.renderCurrentView(viewName);
  }

  renderCurrentView(viewName) {
    const s = this.state.get();
    switch (viewName) {
      case 'dashboard':
        this.views.dashboard.render({ countryData: s.selectedCountryData });
        break;
      case 'holidays':
        this.views.holidays.render(s.holidaysData);
        break;
      case 'events':
        this.views.events.render(s.eventsData);
        break;
      case 'weather':
        this.views.weather.render(s.weatherData);
        break;
      case 'long-weekends':
        this.views['long-weekends'].render(s.longWeekendsData);
        break;
      case 'currency':
        if (s.exchangeRates) {
          const targetCurrency = s.selectedCountryData ? s.selectedCountryData.currencyCode : 'EGP';
          this.views.currency.populateCurrencyDropdowns(s.exchangeRates.conversion_rates, targetCurrency);
          this.views.currency.performConversion();
        }
        break;
      case 'sun-times':
        this.views['sun-times'].render(s.sunTimesData);
        break;
      case 'my-plans':
        this.views['my-plans'].renderPlans();
        break;
    }
  }
}

// Start Application Controller on Load
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
