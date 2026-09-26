# Lidhja e faqes me Google Calendar të studios

Pas këtyre hapave, çdo rezervim nga faqja hyn **direkt si event në Google Calendar të studios**.
Puntorët e shohin në telefon, dhe oraret e zëna **bllokohen automatikisht në faqe**, që dy klientë të mos marrin të njëjtën orë.

Duhet vetëm një llogari Google (Gmail) e studios. Nuk kushton asgjë. Zgjat rreth 10 minuta.

---

## Hapi 1 — Krijo kalendarin e termineve

1. Hyr me Gmail-in e studios në **calendar.google.com**.
2. Majtas, te **Other calendars**, kliko **+** → **Create new calendar**.
3. Emri: `GARA – Termine` → **Create calendar**.
4. Hape kalendarin e ri te **Settings**, pastaj:
   - te **Share with specific people** shto emailin e çdo puntori, me leje **Make changes to events**
     (kështu mund edhe të shtojnë vetë termine nga telefoni, p.sh. klientët që thërrasin);
   - poshtë, te **Integrate calendar**, kopjo **Calendar ID**
     (duket si `abc123...@group.calendar.google.com`).

Puntorët e marrin ftesën me email dhe kalendari u shfaqet në Google Calendar.
Në iPhone mund ta shohin edhe në aplikacionin Calendar, pasi të shtojnë llogarinë Google te Settings → Calendar → Accounts.

## Hapi 2 — Vendos skriptin

1. Hap **script.google.com** (me të njëjtin Gmail) → **New project**.
2. Fshi gjithçka që është aty dhe ngjit përmbajtjen e skedarit `Code.gs` nga ky dosje.
3. Në rreshtin `const CALENDAR_ID = "primary";` zëvendëso `primary` me Calendar ID-në nga Hapi 1, p.sh.:
   ```js
   const CALENDAR_ID = "abc123...@group.calendar.google.com";
   ```
4. Ruaje me **Ctrl + S**.

## Hapi 3 — Publikoje si Web App

1. Lart djathtas: **Deploy** → **New deployment**.
2. Te ikona ⚙️ pranë "Select type" zgjidh **Web app**.
3. Plotëso:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. **Deploy** → **Authorize access** → zgjidh llogarinë.
   Nëse del "Google hasn't verified this app": **Advanced** → **Go to … (unsafe)** → **Allow**.
   Kjo është normale, sepse skripti është yti dhe nuk është publikuar në Google.
5. Kopjo **Web app URL** (fillon me `https://script.google.com/macros/s/…/exec`).

## Hapi 4 — Lidhe me faqen

Në `script.js`, në fillim, vendos linkun te `bookingApi`:

```js
bookingApi: "https://script.google.com/macros/s/…/exec",
```

(Ose ma dërgo linkun dhe e vendos unë.)

---

## Si funksionon pastaj

- Klienti zgjedh shërbimin, ditën dhe orën. Faqja shfaq vetëm oraret që janë **të lira në kalendar**.
- Kur shtyp **Konfirmo**, termini krijohet në `GARA – Termine` me emrin, telefonin dhe shërbimin e klientit.
- Nëse një puntor shton vetë një event në atë kalendar (pauzë, klient me telefon, pushim), ai orar **bllokohet** në faqe.
  Një event **gjithë ditën** (p.sh. "Pushim") e mbyll gjithë ditën.
- Faqja nuk tregon kurrë emrat e klientëve të tjerë, vetëm cilat orare janë të zëna.
- Nëse lidhja me Google dështon për ndonjë arsye, faqja kalon automatikisht te dërgimi me WhatsApp / Viber / SMS.

## Kur ndryshon orari ose skripti

- **Orari i punës** duhet ndryshuar në të dy vendet: `script.js` (CONFIG.hours) dhe `Code.gs` (HOURS).
- Pas çdo ndryshimi në `Code.gs`: **Deploy** → **Manage deployments** → ✏️ → **Version: New version** → **Deploy**.
  Linku mbetet i njëjtë.
