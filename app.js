/* =========================================================
   Chrono — Real-Time World Clock
   ========================================================= */

// ---------- Timezone data ----------
const TIMEZONES = [
  { label: "Local (auto)", tz: null }, // null = use system
  { label: "UTC", tz: "UTC" },
  { label: "London", tz: "Europe/London" },
  { label: "Paris", tz: "Europe/Paris" },
  { label: "Berlin", tz: "Europe/Berlin" },
  { label: "Moscow", tz: "Europe/Moscow" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Karachi", tz: "Asia/Karachi" },
  { label: "Mumbai / Delhi (IST)", tz: "Asia/Kolkata" },
  { label: "Dhaka", tz: "Asia/Dhaka" },
  { label: "Bangkok", tz: "Asia/Bangkok" },
  { label: "Singapore", tz: "Asia/Singapore" },
  { label: "Hong Kong", tz: "Asia/Hong_Kong" },
  { label: "Shanghai / Beijing", tz: "Asia/Shanghai" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Seoul", tz: "Asia/Seoul" },
  { label: "Sydney", tz: "Australia/Sydney" },
  { label: "Auckland", tz: "Pacific/Auckland" },
  { label: "Honolulu", tz: "Pacific/Honolulu" },
  { label: "Anchorage", tz: "America/Anchorage" },
  { label: "Los Angeles", tz: "America/Los_Angeles" },
  { label: "Denver", tz: "America/Denver" },
  { label: "Chicago", tz: "America/Chicago" },
  { label: "New York", tz: "America/New_York" },
  { label: "Toronto", tz: "America/Toronto" },
  { label: "São Paulo", tz: "America/Sao_Paulo" },
  { label: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
  { label: "Cairo", tz: "Africa/Cairo" },
  { label: "Johannesburg", tz: "Africa/Johannesburg" },
  { label: "Lagos", tz: "Africa/Lagos" },
  { label: "Nairobi", tz: "Africa/Nairobi" },
];

// ---------- State ----------
let activeTz = null; // null = system local
let worldCities = [
  { name: "New York", tz: "America/New_York", country: "USA" },
  { name: "London", tz: "Europe/London", country: "UK" },
  { name: "Tokyo", tz: "Asia/Tokyo", country: "Japan" },
  { name: "Sydney", tz: "Australia/Sydney", country: "Australia" },
];

// ---------- DOM refs ----------
const $ = (id) => document.getElementById(id);
const els = {
  locationName: $("locationName"),
  utcOffset: $("utcOffset"),
  timeHH: $("timeHH"),
  timeMM: $("timeMM"),
  timeSS: $("timeSS"),
  ampm: $("ampm"),
  colon1: $("colon1"),
  colon2: $("colon2"),
  dateLine: $("dateLine"),
  tzLine: $("tzLine"),
  handHour: $("handHour"),
  handMinute: $("handMinute"),
  handSecond: $("handSecond"),
  markers: $("markers"),
  tzSelect: $("tzSelect"),
  worldGrid: $("worldGrid"),
  addCityBtn: $("addCityBtn"),
  modal: $("modal"),
  citySearch: $("citySearch"),
  cityResults: $("cityResults"),
  closeModal: $("closeModal"),
};

// ---------- Helpers ----------
function getParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZoneName: "shortOffset",
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  return parts;
}

function getOffsetMinutes(date, timeZone) {
  // Minutes that `timeZone` is ahead of UTC
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function formatOffset(mins) {
  const sign = mins >= 0 ? "+" : "−";
  const abs = Math.abs(mins);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

function isDaytime(date, timeZone) {
  const hour = +new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(date);
  return hour >= 6 && hour < 18;
}

// ---------- Analog markers ----------
function buildMarkers() {
  const ns = "http://www.w3.org/2000/svg";
  for (let i = 0; i < 60; i++) {
    const line = document.createElementNS(ns, "line");
    const isHour = i % 5 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const r1 = isHour ? 128 : 134;
    const r2 = 140;
    line.setAttribute("x1", 150 + r1 * Math.sin(angle));
    line.setAttribute("y1", 150 - r1 * Math.cos(angle));
    line.setAttribute("x2", 150 + r2 * Math.sin(angle));
    line.setAttribute("y2", 150 - r2 * Math.cos(angle));
    line.setAttribute("stroke", isHour ? "#c7d2fe" : "#3a4066");
    line.setAttribute("stroke-width", isHour ? 2.5 : 1);
    line.setAttribute("stroke-linecap", "round");
    els.markers.appendChild(line);
  }
}

// ---------- Render hero clock ----------
function renderHero(now) {
  const tz = activeTz;
  const parts = getParts(now, tz);

  // Digital
  const h12 = parts.hour === "24" ? "12" : parts.hour;
  els.timeHH.textContent = h12.padStart(2, "0");
  els.timeMM.textContent = parts.minute;
  els.timeSS.textContent = parts.second;
  els.ampm.textContent = parts.dayPeriod || "";

  // Date + tz line
  els.dateLine.textContent = `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
  const tzName = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  els.tzLine.textContent = `${tzName} · ${parts.timeZoneName || ""}`;

  // Location name
  if (tz) {
    const found = TIMEZONES.find((t) => t.tz === tz);
    els.locationName.textContent = found ? found.label : tz.replace(/_/g, " ");
  } else {
    els.locationName.textContent = tzName.replace(/_/g, " ");
  }
  const off = getOffsetMinutes(now, tz);
  els.utcOffset.textContent = formatOffset(off);

  // Analog — compute angles from the *displayed* h/m/s
  const h24 = +new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now) % 24;
  const m = +parts.minute;
  const s = +parts.second;
  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hrDeg = (h24 % 12) * 30 + m * 0.5;
  els.handSecond.setAttribute("transform", `rotate(${secDeg} 150 150)`);
  els.handMinute.setAttribute("transform", `rotate(${minDeg} 150 150)`);
  els.handHour.setAttribute("transform", `rotate(${hrDeg} 150 150)`);
}

// ---------- World clock ----------
function renderWorld(now) {
  const localOff = getOffsetMinutes(now, activeTz);
  els.worldGrid.innerHTML = "";

  for (const city of worldCities) {
    const parts = getParts(now, city.tz);
    const off = getOffsetMinutes(now, city.tz);
    const diff = off - localOff;
    const h12 = parts.hour === "24" ? "12" : parts.hour;

    let diffLabel, diffClass;
    if (diff === 0) { diffLabel = "same"; diffClass = "same"; }
    else if (diff > 0) { diffLabel = `+${Math.floor(diff / 60)}h${diff % 60 ? "m" : ""} ahead`; diffClass = "ahead"; }
    else { diffLabel = `−${Math.floor(-diff / 60)}h${diff % 60 ? "m" : ""} behind`; diffClass = "behind"; }

    const day = isDaytime(now, city.tz);

    const card = document.createElement("div");
    card.className = "city-card";
    card.innerHTML = `
      <div class="daynight ${day ? "day" : "night"}"></div>
      <div class="city-name">${city.name}</div>
      <div class="city-country">${city.country}</div>
      <div class="city-time">${h12}:${parts.minute} <span style="font-size:.5em;color:var(--muted)">${parts.dayPeriod || ""}</span></div>
      <div class="city-date">${parts.weekday}, ${parts.month} ${parts.day}</div>
      <span class="city-diff ${diffClass}">${diffLabel}</span>
      <button class="city-remove" title="Remove" aria-label="Remove ${city.name}">✕</button>
    `;
    card.querySelector(".city-remove").addEventListener("click", () => {
      worldCities = worldCities.filter((c) => c !== card._city);
      renderWorld(now);
    });
    card._city = city;
    els.worldGrid.appendChild(card);
  }
}

// ---------- Timezone select ----------
function buildTzSelect() {
  els.tzSelect.innerHTML = "";
  for (const t of TIMEZONES) {
    const opt = document.createElement("option");
    opt.value = t.tz || "";
    opt.textContent = t.label;
    els.tzSelect.appendChild(opt);
  }
  const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const match = TIMEZONES.find((t) => t.tz === sysTz);
  els.tzSelect.value = match ? sysTz : "";
  activeTz = match ? sysTz : null;
}

// ---------- Modal: add city ----------
function openModal() {
  els.modal.hidden = false;
  els.citySearch.value = "";
  renderCityResults("");
  setTimeout(() => els.citySearch.focus(), 50);
}
function closeModal() { els.modal.hidden = true; }

function renderCityResults(query) {
  const q = query.trim().toLowerCase();
  const list = TIMEZONES.filter((t) =>
    t.tz && t.label.toLowerCase().includes(q)
  );
  els.cityResults.innerHTML = "";
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No matching timezone";
    els.cityResults.appendChild(li);
    return;
  }
  for (const t of list) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${t.label}</span><span class="r-tz">${t.tz}</span>`;
    li.addEventListener("click", () => {
      worldCities.push({ name: t.label, tz: t.tz, country: t.tz.split("/")[0].replace(/_/g, " ") });
      closeModal();
    });
    els.cityResults.appendChild(li);
  }
}

// ---------- Events ----------
els.tzSelect.addEventListener("change", (e) => {
  activeTz = e.target.value || null;
});
els.addCityBtn.addEventListener("click", openModal);
els.closeModal.addEventListener("click", closeModal);
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
els.citySearch.addEventListener("input", (e) => renderCityResults(e.target.value));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ---------- Main loop ----------
function tick() {
  const now = new Date();
  renderHero(now);
  renderWorld(now);
  requestAnimationFrame(tick);
}

// ---------- Init ----------
buildMarkers();
buildTzSelect();
tick();
