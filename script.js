/* ==========================================================================
   GARA Hair Studio — konfigurimi dhe logjika e rezervimeve
   Ndrysho vetëm objektin CONFIG për çmime, orar ose numra telefoni.
   ========================================================================== */

const CONFIG = {
  name: "GARA Hair Studio",
  address: "Rr. Jakov Xoxa, 10000 Prishtinë, Kosovë",
  timeZone: "Europe/Belgrade", // zona kohore e Kosovës (CET/CEST)
  mapsUrl: "https://maps.app.goo.gl/t7w5636ooQhJodsd7",
  // numri ku vijnë rezervimet (WhatsApp / Viber / SMS), pa "+" dhe pa hapësira
  bookingPhone: "38349399744",
  // Linku i Google Apps Script (shiko google-apps-script/UDHEZIME.md).
  // Kur është bosh, rezervimi dërgohet vetëm me WhatsApp / Viber / SMS.
  bookingApi: "",
  slotMinutes: 30,
  daysAhead: 14,
  // orari: 0 = e diel ... 6 = e shtunë; null = mbyllur
  hours: {
    1: ["10:00", "22:00"],
    2: ["10:00", "22:00"],
    3: ["10:00", "22:00"],
    4: ["10:00", "22:00"],
    5: ["10:00", "22:00"],
    6: ["10:00", "22:00"],
    0: null,
  },
  services: [
    { id: "cut",      name: "Prerje flokësh",        desc: "Konsultim, larje dhe prerje me gërshërë ose makinë, stilim në fund.", price: 6,  duration: 30 },
    { id: "fade",     name: "Skin fade",             desc: "Fade deri në lëkurë me kalime të buta dhe linja të pastra.",       price: 7,  duration: 40 },
    { id: "beard",    name: "Rregullim mjekre",      desc: "Formësim, konturim me brisk dhe vaj për mjekër.",                   price: 4,  duration: 20 },
    { id: "combo",    name: "Prerje + mjekër",       desc: "Paketa e plotë — flokë dhe mjekër në një termin.",                 price: 9,  duration: 50 },
    { id: "shave",    name: "Rruajtje klasike",      desc: "Peshqir i nxehtë, brisk dhe balsam pas rruajtjes.",                price: 5,  duration: 30 },
    { id: "kids",     name: "Prerje për fëmijë",     desc: "Për djem deri në 12 vjeç.",                                         price: 4,  duration: 25 },
  ],
};

/* ---------- helpers ---------- */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const DOW_SHORT = ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"];
const DOW_LONG  = ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"];
const MONTHS    = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nën", "Dhj"];
const MONTHS_LONG = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];

const pad = (n) => String(n).padStart(2, "0");
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmtMin = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const longDate = (d) => `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;

function chip(tag = "button") {
  const el = document.createElement(tag);
  el.type = "button";
  el.className = "chip";
  el.setAttribute("role", "radio");
  el.setAttribute("aria-checked", "false");
  return el;
}

function selectIn(container, el) {
  $$(".chip", container).forEach((c) => c.setAttribute("aria-checked", String(c === el)));
}

/* ---------- state ---------- */

const state = { service: null, date: null, time: null };

/* ---------- busy times from the studio calendar ---------- */

const busyCache = {};          // "YYYY-MM-DD" -> [[startMin, endMin], ...]
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function loadBusy(date, force = false) {
  const key = dateKey(date);
  if (!CONFIG.bookingApi) return [];
  if (!force && busyCache[key]) return busyCache[key];
  const res = await fetch(`${CONFIG.bookingApi}?date=${key}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "busy_failed");
  busyCache[key] = data.busy;
  return data.busy;
}

/* ---------- render: services menu + choices ---------- */

function renderServices() {
  const menu = $("#serviceMenu");
  const choices = $("#serviceChoices");

  CONFIG.services.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="menu__name">${s.name}<span class="menu__dur">${s.duration} min</span></span>
      <span class="menu__price">€${s.price}</span>
      <p class="menu__desc">${s.desc}</p>`;
    menu.appendChild(li);

    const c = chip();
    c.dataset.id = s.id;
    c.innerHTML = `<span class="chip__title">${s.name}</span><span class="chip__meta">€${s.price} · ${s.duration} min</span>`;
    c.addEventListener("click", () => {
      state.service = s;
      selectIn(choices, c);
      renderTimes();
      updateSummary();
    });
    choices.appendChild(c);
  });
}

/* ---------- render: days ---------- */

function renderDays() {
  const wrap = $("#dayChoices");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < CONFIG.daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const open = CONFIG.hours[d.getDay()];

    const c = chip();
    c.innerHTML = `
      <span class="day__dow">${i === 0 ? "Sot" : DOW_SHORT[d.getDay()]}</span>
      <span class="day__num">${d.getDate()}</span>
      <span class="day__mon">${open ? MONTHS[d.getMonth()] : "Mbyllur"}</span>`;
    c.setAttribute("aria-label", longDate(d) + (open ? "" : " — mbyllur"));

    if (!open || availableSlots(d, 0).length === 0) {
      c.disabled = true;
    } else {
      c.addEventListener("click", () => {
        state.date = d;
        state.time = null;
        selectIn(wrap, c);
        refreshTimes();
        updateSummary();
      });
    }
    wrap.appendChild(c);
  }
}

/* ---------- render: times ---------- */

function availableSlots(date, duration, busy = []) {
  const open = CONFIG.hours[date.getDay()];
  if (!open) return [];
  const start = toMin(open[0]);
  const end = toMin(open[1]);

  let earliest = start;
  const now = new Date();
  if (sameDay(date, now)) {
    // at least 30 min notice for same-day bookings
    const nowMin = now.getHours() * 60 + now.getMinutes() + 30;
    earliest = Math.max(start, Math.ceil(nowMin / CONFIG.slotMinutes) * CONFIG.slotMinutes);
  }

  const slots = [];
  for (let m = start; m + duration <= end; m += CONFIG.slotMinutes) {
    const taken = busy.some(([s, e]) => m < e && m + duration > s);
    slots.push({ min: m, disabled: m < earliest || taken });
  }
  return slots.filter((s) => !s.disabled).length ? slots : [];
}

// Fetch the day's busy times (if the calendar is connected), then draw the slots.
async function refreshTimes(force = false) {
  const date = state.date;
  if (!date || !CONFIG.bookingApi) return renderTimes();
  if (force || !busyCache[dateKey(date)]) {
    $("#timeChoices").innerHTML = `<p class="muted">Duke ngarkuar oraret e lira…</p>`;
  }
  try {
    await loadBusy(date, force);
  } catch (err) {
    busyCache[dateKey(date)] = null; // show all slots; the calendar re-checks on submit
  }
  if (state.date === date) renderTimes();
}

function renderTimes() {
  const wrap = $("#timeChoices");
  wrap.innerHTML = "";

  if (!state.date) {
    wrap.innerHTML = `<p class="muted">Zgjidh një ditë për të parë oraret.</p>`;
    return;
  }

  const duration = state.service ? state.service.duration : CONFIG.slotMinutes;
  const slots = availableSlots(state.date, duration, busyCache[dateKey(state.date)] || []);

  if (!slots.length) {
    wrap.innerHTML = `<p class="muted">Nuk ka orare të lira për këtë ditë.</p>`;
    return;
  }

  slots.forEach((s) => {
    const label = fmtMin(s.min);
    const c = chip();
    c.textContent = label;
    if (s.disabled) {
      c.disabled = true;
    } else {
      if (state.time === label) c.setAttribute("aria-checked", "true");
      c.addEventListener("click", () => {
        state.time = label;
        selectIn(wrap, c);
        updateSummary();
      });
    }
    wrap.appendChild(c);
  });

  // a previously chosen time may no longer fit the new service length
  if (state.time && !slots.some((s) => !s.disabled && fmtMin(s.min) === state.time)) {
    state.time = null;
  }
}

/* ---------- summary ---------- */

function updateSummary() {
  const set = (k, v) => ($(`[data-sum="${k}"]`).textContent = v || "—");
  set("service", state.service && state.service.name);
  set("date", state.date && `${DOW_SHORT[state.date.getDay()]}, ${state.date.getDate()} ${MONTHS[state.date.getMonth()]}`);
  set("time", state.time);
  set("duration", state.service && `${state.service.duration} min`);
}

/* ---------- calendar export ---------- */

function bookingRange() {
  const [h, m] = state.time.split(":").map(Number);
  const start = new Date(state.date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + state.service.duration * 60000);
  return { start, end };
}

// UTC timestamp in iCalendar format: 20260926T170000Z
const icsStamp = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

// Wall-clock time in the studio's zone (20260926T170000), so a booking made
// from a phone in another time zone still lands on the studio's hour.
const localStamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const icsEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function buildIcs(b) {
  const { start, end } = bookingRange();
  const title = `${b.service} — ${CONFIG.name}`;
  const desc = `Termin për ${b.name}\nShërbimi: ${b.service}\nTel. i studios: +${CONFIG.bookingPhone}\n${CONFIG.mapsUrl}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GARA Hair Studio//Booking//SQ",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${CONFIG.timeZone}`,
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@garahairstudio`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART;TZID=${CONFIG.timeZone}:${localStamp(start)}`,
    `DTEND;TZID=${CONFIG.timeZone}:${localStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `LOCATION:${icsEscape(CONFIG.name + ", " + CONFIG.address)}`,
    `URL:${CONFIG.mapsUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Termini te GARA pas 1 ore",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalendarUrl(b) {
  const { start, end } = bookingRange();
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.service} — ${CONFIG.name}`,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    ctz: CONFIG.timeZone,
    details: `Termin për ${b.name}. Tel. i studios: +${CONFIG.bookingPhone}`,
    location: `${CONFIG.name}, ${CONFIG.address}`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function downloadIcs(b) {
  const blob = new Blob([buildIcs(b)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "termini-gara-hair-studio.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------- messages to the studio ---------- */

function bookingMessage(b) {
  return [
    "Përshëndetje GARA Hair Studio,",
    "dëshiroj të rezervoj një termin:",
    "",
    `• Shërbimi: ${b.service}`,
    `• Data: ${b.date}`,
    `• Ora: ${b.time}`,
    `• Emri: ${b.name}`,
    `• Tel: ${b.phone}`,
    b.note ? `• Shënim: ${b.note}` : null,
    "",
    "Ju lutem më konfirmoni. Faleminderit!",
  ].filter((l) => l !== null).join("\n");
}

/* ---------- form submit ---------- */

function showError(msg) {
  const el = $("#formError");
  el.textContent = msg;
  el.hidden = !msg;
}

async function sendToCalendar(booking) {
  const res = await fetch(CONFIG.bookingApi, {
    method: "POST",
    // text/plain keeps this a "simple" request, which Apps Script accepts without CORS preflight
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      service: booking.service,
      duration: state.service.duration,
      date: dateKey(state.date),
      time: booking.time,
      name: booking.name,
      phone: booking.phone,
      note: booking.note,
    }),
  });
  return res.json();
}

async function onSubmit(e) {
  e.preventDefault();
  const name = $("#name");
  const phone = $("#phone");
  [name, phone].forEach((i) => i.removeAttribute("aria-invalid"));

  if (!state.service) return showError("Zgjidh një shërbim.");
  if (!state.date)    return showError("Zgjidh një ditë.");
  if (!state.time)    return showError("Zgjidh një orë.");
  if (name.value.trim().length < 2) {
    name.setAttribute("aria-invalid", "true"); name.focus();
    return showError("Shkruaj emrin tënd.");
  }
  if (phone.value.replace(/\D/g, "").length < 8) {
    phone.setAttribute("aria-invalid", "true"); phone.focus();
    return showError("Shkruaj një numër telefoni të vlefshëm.");
  }
  showError("");

  const booking = {
    service: state.service.name,
    date: longDate(state.date),
    time: state.time,
    name: name.value.trim(),
    phone: phone.value.trim(),
    note: $("#note").value.trim(),
  };

  // With the studio calendar connected, the booking is written there directly.
  let confirmed = false;
  if (CONFIG.bookingApi) {
    const btn = $("#bookingForm button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Duke rezervuar…";
    try {
      const r = await sendToCalendar(booking);
      if (r.ok) {
        confirmed = true;
        busyCache[dateKey(state.date)] = null;
      } else if (r.error === "taken") {
        state.time = null;
        updateSummary();
        await refreshTimes(true);
        return showError("Ky orar sapo u zu nga dikush tjetër. Të lutem zgjidh një orë tjetër.");
      } else if (r.error === "closed") {
        return showError("Ky orar nuk është më i disponueshëm. Zgjidh një orë tjetër.");
      }
      // any other error: fall through to the WhatsApp / Viber / SMS flow
    } catch (err) {
      // network problem: fall through to the messaging flow
    } finally {
      btn.disabled = false;
      btn.textContent = "Konfirmo terminin";
    }
  }

  $("#dlgEyebrow").textContent = confirmed ? "Termini u rezervua" : "Termini u përgatit";
  $("#dlgSend").hidden = confirmed;
  $("#dlgCalHint").textContent = confirmed
    ? "Termini është regjistruar te ne. Nëse do, ruaje edhe në kalendarin tënd — me kujtesë 1 orë para."
    : "Në iPhone hapet direkt aplikacioni Calendar me kujtesë 1 orë para.";

  const msg = encodeURIComponent(bookingMessage(booking));
  $("[data-dlg=name]").textContent = booking.name.split(" ")[0];
  $("[data-dlg=when]").textContent = `${booking.service} · ${booking.date} · ora ${booking.time}`;
  $("#gcalBtn").href = googleCalendarUrl(booking);
  $("#waBtn").href = `https://wa.me/${CONFIG.bookingPhone}?text=${msg}`;
  $("#viberBtn").href = `viber://chat?number=%2B${CONFIG.bookingPhone}&draft=${msg}`;
  // iOS uses "&body", Android "?body" — "?&body" works on both
  $("#smsBtn").href = `sms:+${CONFIG.bookingPhone}?&body=${msg}`;
  $("#icsBtn").onclick = () => downloadIcs(booking);

  const dlg = $("#confirmDialog");
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");

  if (confirmed) {
    $("#bookingForm").reset();
    state.time = null;
    updateSummary();
    refreshTimes(true);
  }
}

/* ---------- hours list ---------- */

function renderHours() {
  const dl = $("#hoursList");
  const todayDow = new Date().getDay();
  [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
    const h = CONFIG.hours[d];
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = DOW_LONG[d];
    dd.textContent = h ? `${h[0]} – ${h[1]}` : "Mbyllur";
    if (d === todayDow) { dt.classList.add("is-today"); dd.classList.add("is-today"); }
    dl.append(dt, dd);
  });
}

/* ---------- chrome: nav + reveal ---------- */

function initChrome() {
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const targets = $$(".split__body > *, .split__label");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach((t) => { t.classList.add("reveal"); io.observe(t); });
  }

  $("#year").textContent = new Date().getFullYear();

  const dlg = $("#confirmDialog");
  $("#dlgClose").addEventListener("click", () => dlg.close ? dlg.close() : dlg.removeAttribute("open"));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
}

/* ---------- boot ---------- */

renderServices();
renderDays();
renderHours();
initChrome();
$("#bookingForm").addEventListener("submit", onSubmit);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
