const cities = {
  Dhaka: {
    condition: "Sunny",
    summary: "Bright and warm",
    temp: 32,
    feels: 35,
    humidity: 68,
    wind: 14,
    pressure: 1007,
    visibility: 8,
    uv: 8,
    rain: 12,
    type: "sunny"
  },
  Seattle: {
    condition: "Rain",
    summary: "Steady showers",
    temp: 13,
    feels: 12,
    humidity: 86,
    wind: 18,
    pressure: 1011,
    visibility: 6,
    uv: 2,
    rain: 78,
    type: "rain"
  },
  Reykjavik: {
    condition: "Snow",
    summary: "Cold flurries",
    temp: -2,
    feels: -7,
    humidity: 74,
    wind: 24,
    pressure: 996,
    visibility: 5,
    uv: 1,
    rain: 44,
    type: "snow"
  },
  Singapore: {
    condition: "Storm",
    summary: "Thunder nearby",
    temp: 29,
    feels: 34,
    humidity: 82,
    wind: 22,
    pressure: 1004,
    visibility: 7,
    uv: 6,
    rain: 84,
    type: "storm"
  },
  London: {
    condition: "Cloudy",
    summary: "Mostly cloudy",
    temp: 16,
    feels: 15,
    humidity: 71,
    wind: 17,
    pressure: 1016,
    visibility: 9,
    uv: 3,
    rain: 35,
    type: "cloud"
  },
  Tokyo: {
    condition: "Sunny",
    summary: "Clear afternoon",
    temp: 25,
    feels: 26,
    humidity: 58,
    wind: 11,
    pressure: 1014,
    visibility: 10,
    uv: 7,
    rain: 8,
    type: "sunny"
  }
};

const state = {
  city: "Dhaka",
  unit: "C",
  theme: localStorage.getItem("weatherplay:theme") || "light",
  favorites: JSON.parse(localStorage.getItem("weatherplay:favorites") || '["Dhaka","Tokyo"]'),
  selectedHour: 0,
  score: 0,
  gameActive: false,
  soundOn: false,
  weather: null,
  requestId: 0
};

const els = {
  cityInput: document.querySelector("#cityInput"),
  cityOptions: document.querySelector("#cityOptions"),
  searchForm: document.querySelector("#searchForm"),
  apiStatus: document.querySelector("#apiStatus"),
  locationButton: document.querySelector("#locationButton"),
  unitC: document.querySelector("#unitC"),
  unitF: document.querySelector("#unitF"),
  soundToggle: document.querySelector("#soundToggle"),
  motionToggle: document.querySelector("#motionToggle"),
  themeToggle: document.querySelector("#themeToggle"),
  favoriteButton: document.querySelector("#favoriteButton"),
  favoriteList: document.querySelector("#favoriteList"),
  localTime: document.querySelector("#localTime"),
  cityName: document.querySelector("#cityName"),
  conditionPill: document.querySelector("#conditionPill"),
  weatherIcon: document.querySelector("#weatherIcon"),
  temperature: document.querySelector("#temperature"),
  conditionText: document.querySelector("#conditionText"),
  feelsLike: document.querySelector("#feelsLike"),
  weatherAvatar: document.querySelector("#weatherAvatar"),
  avatarTitle: document.querySelector("#avatarTitle"),
  avatarAdvice: document.querySelector("#avatarAdvice"),
  metricGrid: document.querySelector("#metricGrid"),
  hourlyStrip: document.querySelector("#hourlyStrip"),
  hourDetail: document.querySelector("#hourDetail"),
  outfitSuggestion: document.querySelector("#outfitSuggestion"),
  activitySuggestion: document.querySelector("#activitySuggestion"),
  forecastList: document.querySelector("#forecastList"),
  mapCanvas: document.querySelector("#mapCanvas"),
  mapCity: document.querySelector("#mapCity"),
  rainField: document.querySelector("#rainField"),
  startGame: document.querySelector("#startGame"),
  gameArea: document.querySelector("#gameArea"),
  gameTarget: document.querySelector("#gameTarget"),
  gameStatus: document.querySelector("#gameStatus")
};

function toDisplayTemp(value) {
  if (state.unit === "F") {
    return Math.round(value * 9 / 5 + 32);
  }
  return Math.round(value);
}

function degree(value) {
  return `${toDisplayTemp(value)}°`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDemoWeather(cityName = state.city) {
  const makeTimeAware = (weather) => {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    return {
      ...weather,
      condition: weather.type === "sunny" && !isDay ? "Clear" : weather.condition,
      summary: weather.type === "sunny" && !isDay ? "Clear and calm" : weather.summary,
      isDay,
      sunrise: "06:00 AM",
      sunset: "06:00 PM",
      moonPhase: "Waxing Crescent",
      moonIllumination: "32",
      uv: isDay ? weather.uv : 0
    };
  };

  if (cities[cityName]) return makeTimeAware(cities[cityName]);
  const names = Object.keys(cities);
  const seed = cityName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = cities[names[seed % names.length]];
  return makeTimeAware({
    ...base,
    temp: base.temp + seed % 5 - 2,
    feels: base.feels + seed % 4 - 1,
    humidity: Math.min(95, base.humidity + seed % 9),
    wind: base.wind + seed % 7,
    rain: Math.min(92, base.rain + seed % 12)
  });
}

function getWeather() {
  return state.weather || getDemoWeather();
}

function mapCondition(condition) {
  const text = condition.toLowerCase();
  if (text.includes("thunder")) return "storm";
  if (text.includes("snow") || text.includes("sleet") || text.includes("ice")) return "snow";
  if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) return "rain";
  if (text.includes("cloud") || text.includes("overcast") || text.includes("mist") || text.includes("fog")) return "cloud";
  return "sunny";
}

async function fetchLiveWeather(cityName) {
  const params = new URLSearchParams({ q: cityName });
  const response = await fetch(`/api/weather?${params.toString()}`, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const message = details.error || "Weather request failed.";
    throw new Error(message);
  }
  return response.json();
}

function normalizeLiveWeather(data) {
  const current = data.current;
  const today = data.forecast.forecastday[0];
  const isDay = current.is_day !== 0;
  const type = mapCondition(current.condition.text);
  const astro = today.astro || {};
  return {
    cityName: `${data.location.name}, ${data.location.country}`,
    condition: current.condition.text,
    summary: current.condition.text,
    temp: current.temp_c,
    feels: current.feelslike_c,
    humidity: current.humidity,
    wind: current.wind_kph,
    pressure: current.pressure_mb,
    visibility: current.vis_km,
    uv: current.uv,
    rain: today.day.daily_chance_of_rain,
    type,
    isDay,
    sunrise: astro.sunrise || "N/A",
    sunset: astro.sunset || "N/A",
    moonPhase: astro.moon_phase || "N/A",
    moonIllumination: astro.moon_illumination || "N/A",
    localTime: data.location.localtime,
    updated: current.last_updated,
    hourly: today.hour.slice(new Date().getHours()).concat(today.hour).slice(0, 12).map((hour) => ({
      hour: hour.time.slice(11, 16),
      temp: hour.temp_c,
      rain: hour.chance_of_rain,
      wind: hour.wind_kph,
      condition: hour.condition.text
    })),
    forecast: data.forecast.forecastday.map((day, index) => ({
      day: index === 0 ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short" }),
      high: day.day.maxtemp_c,
      low: day.day.mintemp_c,
      rain: day.day.daily_chance_of_rain
    }))
  };
}

async function loadWeather() {
  const requestId = state.requestId + 1;
  state.requestId = requestId;

  els.apiStatus.textContent = "Loading live weather...";
  try {
    const data = await fetchLiveWeather(state.city);
    if (requestId !== state.requestId) return;
    state.weather = normalizeLiveWeather(data);
    els.apiStatus.textContent = "Live weather active.";
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.weather = getDemoWeather();
    els.apiStatus.textContent = `Demo data shown: ${error.message}`;
  }
}

function buildHourly(weather) {
  if (weather.hourly) return weather.hourly;
  return Array.from({ length: 12 }, (_, index) => {
    const hour = (new Date().getHours() + index) % 24;
    const wave = Math.sin(index / 2) * 3;
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      temp: weather.temp + wave - (index > 7 ? 2 : 0),
      rain: Math.max(0, Math.min(98, weather.rain + Math.round(Math.cos(index) * 12))),
      wind: weather.wind + index % 4,
      condition: index % 5 === 0 ? weather.condition : weather.summary
    };
  });
}

function buildForecast(weather) {
  if (weather.forecast) return weather.forecast;
  const days = ["Today", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];
  return days.map((day, index) => ({
    day,
    high: weather.temp + 2 - index % 3,
    low: weather.temp - 5 - index % 4,
    rain: Math.max(4, Math.min(94, weather.rain + (index - 3) * 6))
  }));
}

function moonPhaseClass(phase = "") {
  return phase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function renderSkyIcon(weather) {
  if (weather.isDay) {
    return '<span class="icon-sun"></span>';
  }
  const phase = moonPhaseClass(weather.moonPhase);
  const label = escapeHtml(weather.moonPhase || "Moon");
  return `<span class="icon-moon phase-${phase}" title="${label}"></span><span class="moon-label">${label}</span>`;
}

function iconClass(type) {
  return {
    sunny: "icon-sun",
    rain: "icon-rain",
    storm: "icon-storm",
    snow: "icon-snow",
    cloud: "icon-cloud"
  }[type] || "icon-cloud";
}

function setTheme(type) {
  document.body.classList.remove("rainy-theme", "storm-theme", "snow-theme");
  if (type === "rain") document.body.classList.add("rainy-theme");
  if (type === "storm") document.body.classList.add("storm-theme");
  if (type === "snow") document.body.classList.add("snow-theme");
}

function setColorMode(theme) {
  state.theme = theme;
  document.body.classList.toggle("amoled-theme", theme === "dark");
  els.themeToggle.checked = theme === "dark";
  localStorage.setItem("weatherplay:theme", theme);
}

function renderRain(type) {
  els.rainField.innerHTML = "";
  const count = type === "storm" ? 80 : type === "rain" ? 48 : type === "snow" ? 34 : 0;
  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement("span");
    drop.className = "drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.setProperty("--speed", `${0.8 + Math.random() * 0.9}s`);
    drop.style.setProperty("--delay", `${Math.random() * -2}s`);
    if (type === "snow") {
      drop.style.width = "7px";
      drop.style.height = "7px";
      drop.style.borderRadius = "50%";
      drop.style.background = "rgba(255, 255, 255, 0.72)";
    }
    els.rainField.appendChild(drop);
  }
}

function renderMetrics(weather) {
  const metrics = [
    ["Humidity", `${weather.humidity}%`],
    ["Wind", `${weather.wind} km/h`],
    ["Pressure", `${weather.pressure} hPa`],
    ["Visibility", `${weather.visibility} km`],
    ["UV Index", weather.uv],
    ["Rain Chance", `${weather.rain}%`],
    ["Sunrise", weather.sunrise || "N/A"],
    ["Sunset", weather.sunset || "N/A"],
    ["Moon Phase", weather.moonPhase || "N/A"],
    ["Moon Light", weather.moonIllumination === "N/A" ? "N/A" : `${weather.moonIllumination}%`]
  ];
  els.metricGrid.innerHTML = metrics.map(([label, value]) => `
    <article class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
    </article>
  `).join("");
}

function renderHourly(weather) {
  const hourly = buildHourly(weather);
  els.hourlyStrip.innerHTML = hourly.map((item, index) => `
    <button class="hour-card ${index === state.selectedHour ? "active" : ""}" type="button" data-hour="${index}">
      <span>${escapeHtml(item.hour)}</span>
      <strong>${degree(item.temp)}</strong>
      <span>${escapeHtml(item.rain)}% rain</span>
    </button>
  `).join("");
  const selected = hourly[state.selectedHour];
  els.hourDetail.textContent = `${selected.hour}: ${selected.condition}, ${degree(selected.temp)}, wind ${selected.wind} km/h, rain ${selected.rain}%.`;
}

function renderForecast(weather) {
  els.forecastList.innerHTML = buildForecast(weather).map((day) => {
    const scale = Math.max(32, Math.min(100, 45 + day.rain / 2));
    return `
      <button class="forecast-day" type="button" title="${day.rain}% rain chance">
        <strong>${escapeHtml(day.day)}</strong>
        <span class="forecast-bar" style="transform: scaleX(${scale / 100})"></span>
        <span class="forecast-meta">${degree(day.low)} / ${degree(day.high)}</span>
      </button>
    `;
  }).join("");
}

function recommendations(weather) {
  if (weather.type === "snow") {
    return {
      outfit: ["Layer up", "Insulated jacket, scarf, gloves, and boots."],
      activity: ["Warm route", "Short walk, hot drink stop, or indoor climbing."]
    };
  }
  if (weather.type === "rain" || weather.type === "storm") {
    return {
      outfit: ["Rain ready", "Waterproof shell, quick-dry shoes, and compact umbrella."],
      activity: ["Covered plan", "Cafe work session, gallery visit, or a short transit-friendly errand."]
    };
  }
  if (weather.temp >= 28) {
    return {
      outfit: weather.isDay
        ? ["Stay cool", "Breathable shirt, sunglasses, hat, and a water bottle."]
        : ["Warm night", "Breathable clothes and comfortable shoes; no sunscreen needed."],
      activity: weather.isDay
        ? ["Morning outside", "Walk early, rooftop dinner later, shade during peak heat."]
        : ["Evening outside", "Late walk, rooftop tea, or a calm night drive."]
    };
  }
  return {
    outfit: ["Light layers", "Comfortable jacket, sneakers, and a thin overshirt."],
    activity: ["Easy outside", "Bike ride, park walk, or outdoor lunch."]
  };
}

function renderRecommendations(weather) {
  const rec = recommendations(weather);
  els.outfitSuggestion.innerHTML = `<strong>${escapeHtml(rec.outfit[0])}</strong><p>${escapeHtml(rec.outfit[1])}</p>`;
  els.activitySuggestion.innerHTML = `<strong>${escapeHtml(rec.activity[0])}</strong><p>${escapeHtml(rec.activity[1])}</p>`;
}

function renderAvatar(weather) {
  els.weatherAvatar.className = "avatar";
  if (weather.type === "rain") els.weatherAvatar.classList.add("rainy");
  if (weather.type === "storm") els.weatherAvatar.classList.add("stormy");
  if (weather.type === "snow") els.weatherAvatar.classList.add("cold");
  if (!weather.isDay) els.weatherAvatar.classList.add("night");
  els.avatarTitle.textContent = `${weather.condition} mode`;
  els.avatarAdvice.textContent = recommendations(weather).outfit[1];
}

function renderFavorites() {
  els.favoriteList.innerHTML = state.favorites.map((city) => `
    <button class="favorite-chip ${city === state.city ? "active" : ""}" type="button" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>
  `).join("");
  els.favoriteButton.textContent = state.favorites.includes(state.city) ? "Saved" : "Add";
  localStorage.setItem("weatherplay:favorites", JSON.stringify(state.favorites));
}

function renderAll() {
  renderAllAsync();
}

async function renderAllAsync() {
  await loadWeather();
  const weather = getWeather();
  const now = new Date();
  setTheme(weather.type);
  renderRain(weather.type);
  els.cityName.textContent = weather.cityName || state.city;
  els.cityInput.value = state.city;
  els.localTime.textContent = weather.localTime ? `Local time ${weather.localTime}` : `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  els.conditionPill.textContent = weather.condition;
  els.weatherIcon.innerHTML = renderSkyIcon(weather);
  els.temperature.textContent = degree(weather.temp);
  els.conditionText.textContent = weather.summary;
  els.feelsLike.textContent = `Feels like ${degree(weather.feels)}`;
  els.mapCity.textContent = state.city;
  renderMetrics(weather);
  renderHourly(weather);
  renderForecast(weather);
  renderRecommendations(weather);
  renderAvatar(weather);
  renderFavorites();
}

function chooseCity(city) {
  const normalized = city.trim();
  if (!normalized) return;
  state.city = normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  state.selectedHour = 0;
  renderAll();
}

function startGame() {
  state.gameActive = true;
  state.score = 0;
  els.gameStatus.textContent = "Score 0. Click the target before the round ends.";
  moveTarget();
  setTimeout(() => {
    state.gameActive = false;
    els.gameStatus.textContent = `Round complete. Final score ${state.score}.`;
  }, 12000);
}

function moveTarget() {
  const maxX = els.gameArea.clientWidth - 58;
  const maxY = els.gameArea.clientHeight - 112;
  els.gameTarget.style.left = `${20 + Math.random() * Math.max(40, maxX - 20)}px`;
  els.gameTarget.style.top = `${20 + Math.random() * Math.max(40, maxY - 20)}px`;
}

Object.keys(cities).forEach((city) => {
  const option = document.createElement("option");
  option.value = city;
  els.cityOptions.appendChild(option);
});

els.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  chooseCity(els.cityInput.value);
});

els.locationButton.addEventListener("click", () => chooseCity("Dhaka"));

els.unitC.addEventListener("click", () => {
  state.unit = "C";
  els.unitC.classList.add("active");
  els.unitF.classList.remove("active");
  els.unitC.setAttribute("aria-pressed", "true");
  els.unitF.setAttribute("aria-pressed", "false");
  renderAll();
});

els.unitF.addEventListener("click", () => {
  state.unit = "F";
  els.unitF.classList.add("active");
  els.unitC.classList.remove("active");
  els.unitF.setAttribute("aria-pressed", "true");
  els.unitC.setAttribute("aria-pressed", "false");
  renderAll();
});

els.soundToggle.addEventListener("change", () => {
  state.soundOn = els.soundToggle.checked;
  els.conditionPill.textContent = state.soundOn ? "Sound on" : getWeather().condition;
  setTimeout(() => {
    els.conditionPill.textContent = getWeather().condition;
  }, 900);
});

els.motionToggle.addEventListener("change", () => {
  document.body.classList.toggle("reduced-motion", els.motionToggle.checked);
});

els.themeToggle.addEventListener("change", () => {
  setColorMode(els.themeToggle.checked ? "dark" : "light");
});

els.favoriteButton.addEventListener("click", () => {
  if (!state.favorites.includes(state.city)) {
    state.favorites.push(state.city);
  }
  renderFavorites();
});

els.favoriteList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-city]");
  if (button) chooseCity(button.dataset.city);
});

els.hourlyStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-hour]");
  if (!button) return;
  state.selectedHour = Number(button.dataset.hour);
  renderHourly(getWeather());
});

document.querySelectorAll(".layer").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".layer").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    els.mapCanvas.className = `map-canvas ${button.dataset.layer}`;
  });
});

els.startGame.addEventListener("click", startGame);
els.gameTarget.addEventListener("click", () => {
  if (!state.gameActive) return;
  state.score += 1;
  els.gameStatus.textContent = `Score ${state.score}. Keep going.`;
  moveTarget();
});

setColorMode(state.theme);
renderAll();
