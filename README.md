# A.Awad Bauservice — Website

Statische Website für **Bauservice.Awad-Handwerk**, Inhaber Adnan Awad,
Bernauer Str. 122, 16515 Oranienburg — Fachbetrieb für Fliesen und Trockenbau.

Kein Framework, kein CMS, keine Datenbank: reines HTML, CSS und JavaScript.
Die Seite läuft auf jedem Webspace, der Dateien ausliefern kann.

---

## Wichtig vor dem Livegang

Diese Angaben stammen aus öffentlich zugänglichen Quellen (bisherige Website,
Impressum, Handwerkskammer-Eintrag). **Bitte vor der Veröffentlichung prüfen
und bei Bedarf korrigieren:**

| Angabe | Steht aktuell auf der Seite | Prüfen |
|---|---|---|
| Umsatzsteuer-ID | `DE455118425` | Auf der alten Seite als „Steuernummer" bezeichnet. Das Format `DE…` ist jedoch eine **USt-IdNr. nach § 27a UStG** — hier entsprechend ausgewiesen. Bitte bestätigen. |
| Anschrift der Handwerkskammer | Charlottenstraße 34–36, 14467 Potsdam | Hausnummer gegenprüfen |
| Öffnungs-/Erreichbarkeitszeiten | **nicht angegeben** | Falls gewünscht, ergänzen (siehe unten) |
| „Rückmeldung in der Regel innerhalb von 24 Stunden" | mehrfach auf der Seite | Nur beibehalten, wenn realistisch zugesagt werden kann |
| „Angebot kostenlos und unverbindlich" | Hero, Ablauf, FAQ | Bestätigen |
| Einsatzorte | Liste unter „Einsatzgebiet" | Orte streichen/ergänzen |
| E-Mail-Adresse | `info@bauservice-awad.de` | Postfach muss erreichbar sein |

**Bewusst *nicht* aufgenommen**, weil nicht belegbar: Gründungsjahr,
Kundenbewertungen/Sternebewertungen, Anzahl abgeschlossener Projekte,
konkreter Einsatzradius in Kilometern. Solche Angaben sind wettbewerbsrechtlich
angreifbar, wenn sie nicht stimmen — bitte nur mit echten Zahlen ergänzen.

---

## Aufbau

```
├── index.html            erzeugte Seiten (das ist die Website)
├── leistungen.html
├── projekte.html
├── kontakt.html
├── impressum.html
├── datenschutz.html
├── 404.html
├── sitemap.xml           automatisch erzeugt
├── robots.txt            automatisch erzeugt
├── site.webmanifest      automatisch erzeugt
├── favicon.ico
├── build.js              Seitengenerator
├── src/
│   ├── layout.html       gemeinsames Gerüst (Kopf, Navigation, Fußbereich)
│   └── pages/            Inhalte je Seite + Metadaten
└── assets/
    ├── css/style.css     Design-System
    ├── css/fonts.css     selbst gehostete Schriften
    ├── fonts/            Sora + Inter als WOFF2 (SIL Open Font License)
    ├── img/              Bilder, Logo, Favicons, Social-Bild
    └── js/main.js        Navigation, Galerie, Formular
```

### Inhalte ändern

Texte werden in `src/pages/` bearbeitet, danach einmal:

```bash
node build.js
```

Das schreibt die fertigen HTML-Dateien neu. Kopf- und Fußbereich liegen nur
einmal in `src/layout.html` — eine Änderung dort wirkt auf allen Seiten.

Wer kein Node.js nutzen möchte, kann die erzeugten `.html`-Dateien auch direkt
bearbeiten. Dann aber bitte `src/` entsprechend nachziehen, sonst überschreibt
der nächste Build-Lauf die Änderungen.

---

## Veröffentlichen

Es ist **kein Build-Schritt nötig**, um die Seite zu betreiben. Alle Dateien im
Projektverzeichnis (außer `src/`, `build.js`, `README.md`) auf den Webspace
laden — fertig.

**Wichtig:** Die Seite muss über **HTTPS** erreichbar sein (Pflicht laut DSGVO
und in der Datenschutzerklärung so zugesichert). Jeder gängige Hoster bietet
dafür ein kostenloses Let's-Encrypt-Zertifikat.

Die 404-Seite muss beim Hoster hinterlegt werden:

* **Apache** (IONOS, Strato, All-Inkl): eine Datei `.htaccess` mit
  `ErrorDocument 404 /404.html`
* **Netlify / Vercel / Cloudflare Pages**: wird automatisch erkannt

---

## Kontaktformular

Standardmäßig arbeitet das Formular **ohne Server**: Nach dem Absenden öffnet
sich das E-Mail-Programm des Besuchers mit einer fertig vorbereiteten Nachricht.
Das funktioniert sofort und überall, verlangt aber einen letzten Klick des
Besuchers auf „Senden".

Für echten Direktversand in `assets/js/main.js` ganz oben eintragen:

```js
var FORM_ENDPOINT = 'https://formspree.io/f/IHRE-ID';
```

Geeignete Dienste: Formspree, Netlify Forms, Basin oder ein eigenes
PHP-Skript. Danach bitte Abschnitt 5.1 der Datenschutzerklärung um den
tatsächlich eingesetzten Dienst ergänzen.

Eine versteckte Spam-Falle („Honeypot") ist bereits eingebaut.

---

## Erreichbarkeitszeiten ergänzen (optional)

Falls feste Zeiten genannt werden sollen, an zwei Stellen eintragen:

1. sichtbar in `src/pages/kontakt.html` in der Kontaktkarte
2. für Suchmaschinen in `build.js` im Objekt `ld.business`:

```js
openingHoursSpecification: [{
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
  opens: '07:00', closes: '17:00'
}],
```

---

## Was die Seite technisch mitbringt

**Datenschutz**
* Keine Cookies, kein Tracking, keine Analyse-Werkzeuge
* Keine Verbindung zu Servern Dritter beim Seitenaufruf (geprüft: 0 Fremd-Hosts)
* Schriften lokal gehostet statt über Google Fonts
  (vgl. LG München I, Az. 3 O 17493/20)
* Kartendienste nur als Link, nicht eingebettet
* **Dadurch ist kein Cookie-Banner erforderlich.**

**Suchmaschinen**
* Strukturierte Daten: `HomeAndConstructionBusiness`, `WebSite`, `FAQPage`,
  `BreadcrumbList` — die FAQ-Daten werden beim Build automatisch aus dem
  sichtbaren Text erzeugt, können also nicht auseinanderlaufen
* Eigener Title und eigene Description je Seite, Canonical-URLs
* `sitemap.xml` und `robots.txt` werden mitgeneriert
* Ortsbezogene Inhalte für „Fliesenleger Oranienburg" und Umgebung

**Barrierefreiheit**
* Alle geprüften Textfarben erfüllen WCAG 2.1 AA (gemessen an gerenderten
  Pixeln, u. a. Hero-Badge 14,6:1, Bildunterschriften 5,7:1)
* Sprunglink, sichtbare Fokusrahmen, vollständige Tastaturbedienung
* Saubere Überschriftenhierarchie, beschriftete Formularfelder,
  Fehlermeldungen per `aria-live`
* Respektiert `prefers-reduced-motion`

**Geschwindigkeit** (lokal gemessen, Startseite)
* 9 Anfragen, rund 209 kB
* First Contentful Paint 116 ms
* Cumulative Layout Shift 0 — kein Nachspringen des Layouts
* Bilder als WebP mit JPEG-Rückfallebene, `width`/`height` überall gesetzt

**Darstellung**
* Getestet von 360 px bis 1440 px Breite, kein horizontaler Überlauf
* Eigenes Druck-Stylesheet
* Fester Anruf-/WhatsApp-Balken auf Mobilgeräten

---

## Bildmaterial

| Datei | Herkunft |
|---|---|
| `projekt-bad-*` | **Eigene Aufnahme** des Betriebs (von der bisherigen Website), aufgehellt und geschärft |
| `fliesenarbeit-*`, `bodenarbeiten-*` | Lizenzfreie Aufnahmen (Pexels-Lizenz), bereits zuvor auf der Website im Einsatz |
| `logo-mark.png`, Favicons, `og-image.jpg` | Aus dem Firmenlogo abgeleitet |

Symbolbilder sind auf der Website ausdrücklich als solche gekennzeichnet.

**Empfehlung:** Der größte Hebel für diese Seite sind **eigene Fotos**.
Vier bis sechs Vorher-/Nachher-Aufnahmen echter Baustellen ersetzen jedes
Symbolbild. Neue Bilder nach `assets/img/` legen und in
`src/pages/projekte.html` eintragen — am besten in zwei Größen (640 px und
1024 px Breite) als `.jpg` und `.webp`.

---

## Farben und Schriften

Die Marke ist aus dem bestehenden Firmenlogo abgeleitet:

| Rolle | Wert |
|---|---|
| Messinggold (Akzent) | `#AA915B` |
| Gold hell (auf Dunkelflächen) | `#C9AC72` |
| Anthrazit (Grundton) | `#101215` |
| Papierweiß | `#F8F7F4` |

Überschriften in **Sora**, Fließtext in **Inter** — beide unter der
SIL Open Font License, lokal eingebunden.
