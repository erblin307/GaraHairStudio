# GARA Hair Studio

Faqe/aplikacion për GARA Hair Studio — barbershop për meshkuj në Prishtinë.

Faqe statike (HTML, CSS, JS), pa server. Mund të hapet direkt ose të publikohet në GitHub Pages / Netlify / Vercel.

## Çfarë ka
- Hyrje, përshkrim i studios, menuja e shërbimeve me çmime, orari, telefonat, harta
- **Rezervim termini**: klienti zgjedh shërbimin, ditën dhe orën, pastaj
  - e ruan terminin në **iPhone Calendar** (skedar `.ics`, me kujtesë 1 orë para) ose në **Google Calendar**
  - ta dërgon kërkesën me mesazh të shkruar gati në **WhatsApp / Viber / SMS** te +383 49 399 744
- Instalohet si aplikacion në telefon (Safari → Share → *Add to Home Screen*)

## Si ndryshohen të dhënat
Gjithçka është në objektin `CONFIG` në fillim të `script.js`:
çmimet dhe shërbimet, orari i punës, numri ku vijnë rezervimet, linku i Google Maps.

## Publikimi në GitHub Pages
Settings → Pages → Source: *Deploy from a branch* → zgjidh degën dhe `/ (root)`.
