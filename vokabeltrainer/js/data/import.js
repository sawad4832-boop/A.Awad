/**
 * Import großer Lernsets.
 *
 * Unterstützt zwei Formen:
 *   1. Einfache Zeilen:  "apple – Apfel"  (auch -, =, :, ;, Tab oder |)
 *   2. CSV mit Kopfzeile: wort;bedeutung;artikel;plural;beispiel;kategorie;bild
 *
 * Zu jedem Eintrag wird – falls möglich – automatisch ein Bild vorgeschlagen.
 */

import { bildVorschlag } from './bilder.js';

const TRENNER = ['\t', '|', ' – ', ' — ', ' - ', '–', '—', ';', '=', ' : ', ':'];

const SPALTEN = {
  wort: ['wort', 'word', 'term', 'begriff', 'fremdsprache', 'vokabel', 'front'],
  bedeutung: ['bedeutung', 'übersetzung', 'uebersetzung', 'translation', 'deutsch', 'back'],
  artikel: ['artikel', 'article', 'genus'],
  plural: ['plural', 'mehrzahl'],
  beispiel: ['beispiel', 'beispielsatz', 'example', 'satz'],
  kategorie: ['kategorie', 'thema', 'category', 'topic'],
  bild: ['bild', 'emoji', 'image', 'symbol']
};

/**
 * @param {string} text
 * @returns {{eintraege: Array<Object>, uebersprungen: string[], art: 'csv'|'zeilen'}}
 */
export function textEinlesen(text) {
  const zeilen = String(text || '').split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  if (!zeilen.length) return { eintraege: [], uebersprungen: [], art: 'zeilen' };

  if (istKopfzeile(zeilen[0])) return csvEinlesen(zeilen);
  return zeilenEinlesen(zeilen);
}

function istKopfzeile(zeile) {
  const felder = csvZeileTeilen(zeile).map((f) => f.toLowerCase().trim());
  if (felder.length < 2) return false;
  const kennt = (name) => Object.values(SPALTEN).some((liste) => liste.includes(name));
  return kennt(felder[0]) && kennt(felder[1]);
}

function spalteZuordnen(name) {
  const gesucht = name.toLowerCase().trim();
  for (const [feld, namen] of Object.entries(SPALTEN)) {
    if (namen.includes(gesucht)) return feld;
  }
  return null;
}

function csvEinlesen(zeilen) {
  const kopf = csvZeileTeilen(zeilen[0]).map(spalteZuordnen);
  const eintraege = [];
  const uebersprungen = [];

  for (const zeile of zeilen.slice(1)) {
    const felder = csvZeileTeilen(zeile);
    /** @type {Object<string,string>} */
    const eintrag = {};
    kopf.forEach((feld, stelle) => {
      if (feld && felder[stelle] !== undefined) eintrag[feld] = felder[stelle].trim();
    });
    if (eintrag.wort && eintrag.bedeutung) eintraege.push(vervollstaendigen(eintrag));
    else if (zeile.trim()) uebersprungen.push(zeile);
  }
  return { eintraege, uebersprungen, art: 'csv' };
}

/** Teilt eine CSV-Zeile an Komma oder Semikolon, Anführungszeichen werden beachtet. */
export function csvZeileTeilen(zeile) {
  const trennzeichen = zeile.split(';').length > zeile.split(',').length ? ';' : ',';
  const felder = [];
  let aktuell = '';
  let inAnfuehrung = false;

  for (let i = 0; i < zeile.length; i += 1) {
    const zeichen = zeile[i];
    if (zeichen === '"') {
      if (inAnfuehrung && zeile[i + 1] === '"') { aktuell += '"'; i += 1; }
      else inAnfuehrung = !inAnfuehrung;
    } else if (zeichen === trennzeichen && !inAnfuehrung) {
      felder.push(aktuell);
      aktuell = '';
    } else {
      aktuell += zeichen;
    }
  }
  felder.push(aktuell);
  return felder;
}

function zeilenEinlesen(zeilen) {
  const eintraege = [];
  const uebersprungen = [];

  for (const zeile of zeilen) {
    const trenner = TRENNER.find((t) => zeile.includes(t));
    if (!trenner) { uebersprungen.push(zeile); continue; }

    const teile = zeile.split(trenner).map((t) => t.trim()).filter((t, i) => i < 3 || t);
    const [wort, bedeutung, beispiel] = teile;
    if (!wort || !bedeutung) { uebersprungen.push(zeile); continue; }

    eintraege.push(vervollstaendigen({ wort, bedeutung, beispiel: beispiel || '' }));
  }
  return { eintraege, uebersprungen, art: 'zeilen' };
}

/** Ergänzt Artikel und Bildvorschlag. */
function vervollstaendigen(eintrag) {
  let wort = eintrag.wort;
  let artikel = eintrag.artikel || '';

  // "el perro" / "la casa" / "der Hund" → Artikel abtrennen
  const artikelTreffer = wort.match(/^(der|die|das|el|la|los|las|le|il|lo)\s+(.+)$/i);
  if (!artikel && artikelTreffer) {
    artikel = artikelTreffer[1];
    wort = artikelTreffer[2];
  }

  const bildWert = eintrag.bild;
  const bild = bildWert
    ? { art: bildWert.startsWith('http') ? 'url' : 'emoji', wert: bildWert, beschreibung: eintrag.bedeutung }
    : bildVorschlag(wort, eintrag.bedeutung);

  return {
    wort,
    bedeutung: eintrag.bedeutung,
    artikel,
    plural: eintrag.plural || '',
    beispiel: eintrag.beispiel || '',
    kategorie: eintrag.kategorie || '',
    bild,
    ton: { art: 'stimme', wert: '' }
  };
}
