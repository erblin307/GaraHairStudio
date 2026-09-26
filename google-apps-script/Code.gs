/**
 * GARA Hair Studio — lidhja e faqes me Google Calendar të studios.
 *
 * Ky skript vendoset në script.google.com me llogarinë Google të studios.
 * Faqja e pyet për oraret e zëna (GET) dhe i dërgon rezervimet e reja (POST);
 * skripti i shkruan ato si evente në kalendarin e studios.
 * Udhëzimet e plota janë te google-apps-script/UDHEZIME.md.
 */

// ID e kalendarit ku ruhen terminet. "primary" = kalendari kryesor i llogarisë.
// Për një kalendar të veçantë (p.sh. "GARA – Termine"), vendos ID-në e tij:
// Google Calendar → Settings → kalendari → Integrate calendar → Calendar ID.
const CALENDAR_ID = "primary";

const TIME_ZONE = "Europe/Belgrade";
const STUDIO = "GARA Hair Studio, Rr. Jakov Xoxa, 10000 Prishtinë";

// Duhet të përputhen me orarin te script.js (0 = e diel … 6 = e shtunë).
const HOURS = {
  1: ["10:00", "22:00"],
  2: ["10:00", "22:00"],
  3: ["10:00", "22:00"],
  4: ["10:00", "22:00"],
  5: ["10:00", "22:00"],
  6: ["10:00", "22:00"],
  0: null,
};

const DAYS_AHEAD = 30;

/* ---------- GET ?date=YYYY-MM-DD → oraret e zëna të asaj dite ---------- */

function doGet(e) {
  const date = String((e && e.parameter && e.parameter.date) || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: "bad_date" });

  const dayStart = parse(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

  // Only times go back to the page — never names or phone numbers.
  const busy = calendar().getEvents(dayStart, dayEnd).map(function (ev) {
    if (ev.isAllDayEvent()) return [0, 1440];
    return [minutesOfDay(ev.getStartTime(), date), minutesOfDay(ev.getEndTime(), date)];
  });

  return json({ ok: true, date: date, busy: busy });
}

/* ---------- POST {service, duration, date, time, name, phone, note} ---------- */

function doPost(e) {
  let b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: "bad_request" });
  }

  const date = String(b.date || "");
  const time = String(b.time || "");
  const duration = Math.round(Number(b.duration));
  const name = clean(b.name, 60);
  const phone = clean(b.phone, 30);
  const service = clean(b.service, 60);
  const note = clean(b.note, 200);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return json({ ok: false, error: "bad_request" });
  if (!(duration >= 10 && duration <= 180)) return json({ ok: false, error: "bad_request" });
  if (name.length < 2 || phone.replace(/\D/g, "").length < 8 || !service) return json({ ok: false, error: "bad_request" });

  const start = parse(date, time);
  const end = new Date(start.getTime() + duration * 60000);

  // Must be inside opening hours and within the booking window.
  const open = HOURS[Number(Utilities.formatDate(start, TIME_ZONE, "u")) % 7];
  if (!open) return json({ ok: false, error: "closed" });
  const startMin = toMin(time);
  if (startMin < toMin(open[0]) || startMin + duration > toMin(open[1])) return json({ ok: false, error: "closed" });
  const now = new Date();
  if (start.getTime() < now.getTime() || start.getTime() > now.getTime() + DAYS_AHEAD * 86400000) {
    return json({ ok: false, error: "closed" });
  }

  // Lock so two clients can't take the same slot at the same moment.
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const cal = calendar();
    if (cal.getEvents(start, end).length > 0) return json({ ok: false, error: "taken" });

    cal.createEvent(service + " — " + name, start, end, {
      location: STUDIO,
      description:
        "Klienti: " + name + "\n" +
        "Tel: " + phone + "\n" +
        "Shërbimi: " + service + " (" + duration + " min)\n" +
        (note ? "Shënim: " + note + "\n" : "") +
        "\nRezervuar online nga faqja.",
    });
  } finally {
    lock.releaseLock();
  }

  return json({ ok: true });
}

/* ---------- helpers ---------- */

function calendar() {
  const cal = CALENDAR_ID === "primary" ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error("Kalendari nuk u gjet: " + CALENDAR_ID);
  return cal;
}

function parse(date, time) {
  return Utilities.parseDate(date + " " + time, TIME_ZONE, "yyyy-MM-dd HH:mm");
}

function toMin(hhmm) {
  const p = hhmm.split(":");
  return Number(p[0]) * 60 + Number(p[1]);
}

// Minutes since midnight of `date` in the studio's zone, clamped to that day.
function minutesOfDay(d, date) {
  const day = Utilities.formatDate(d, TIME_ZONE, "yyyy-MM-dd");
  if (day < date) return 0;
  if (day > date) return 1440;
  return toMin(Utilities.formatDate(d, TIME_ZONE, "HH:mm"));
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
