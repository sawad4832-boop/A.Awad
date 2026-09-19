/**
 * Datenmodell für Vokabeln und Lernsets.
 *
 * Bewusst getrennt von Oberfläche und Lernlogik: hier stehen nur Struktur,
 * Standardwerte und reine Rechenfunktionen auf einer Vokabel.
 */

/**
 * @typedef {'emoji'|'url'|'data'} BildArt
 * @typedef {{art: BildArt, wert: string, beschreibung?: string}} Bild
 * @typedef {{art: 'stimme'|'datei', wert: string}} Ton
 *
 * @typedef {Object} Vokabel
 * @property {string} id
 * @property {string} wort          Fremdsprachliches Wort
 * @property {string} bedeutung     Übersetzung
 * @property {string} artikel
 * @property {string} plural
 * @property {string} beispiel
 * @property {Bild|null} bild
 * @property {Ton|null} ton
 * @property {string} kategorie
 * @property {1|2|3} schwierigkeit  Einschätzung beim Anlegen
 * @property {VokabelStatistik} statistik
 *
 * @typedef {Object} VokabelStatistik
 * @property {number} richtig
 * @property {number} falsch
 * @property {number} schreibfehler
 * @property {number} hinweise
 * @property {number} koennen        0..100, Lernstatus über alle Sessions
 * @property {Object<string,{richtig:number,falsch:number}>} proArt
 * @property {Object<string,number>} verwechslungen  Falsche Antworten und ihre Häufigkeit
 * @property {string|null} zuletzt   ISO-Zeitpunkt
 */

/** Zufällige, gut lesbare ID. */
export function neueId(praefix = 'id') {
  const zufall = Math.random().toString(36).slice(2, 9);
  return `${praefix}_${Date.now().toString(36)}_${zufall}`;
}

/** @returns {VokabelStatistik} */
export function leereStatistik() {
  return {
    richtig: 0,
    falsch: 0,
    schreibfehler: 0,
    hinweise: 0,
    koennen: 0,
    proArt: {},
    verwechslungen: {},
    zuletzt: null
  };
}

/**
 * Erzeugt eine vollständige Vokabel aus Teilangaben.
 * @param {Partial<Vokabel>} rohdaten
 * @returns {Vokabel}
 */
export function vokabelAnlegen(rohdaten = {}) {
  return {
    id: rohdaten.id || neueId('v'),
    wort: (rohdaten.wort || '').trim(),
    bedeutung: (rohdaten.bedeutung || '').trim(),
    artikel: (rohdaten.artikel || '').trim(),
    plural: (rohdaten.plural || '').trim(),
    beispiel: (rohdaten.beispiel || '').trim(),
    bild: rohdaten.bild || null,
    ton: rohdaten.ton || null,
    kategorie: (rohdaten.kategorie || '').trim(),
    schwierigkeit: rohdaten.schwierigkeit || 2,
    statistik: { ...leereStatistik(), ...(rohdaten.statistik || {}) }
  };
}

/**
 * Erzeugt ein Lernset.
 * @param {Partial<Lernset>} rohdaten
 * @returns {Lernset}
 *
 * @typedef {Object} Lernset
 * @property {string} id
 * @property {string} name
 * @property {string} sprache      Anzeigename der Fremdsprache
 * @property {string} sprachcode   BCP-47 für die Sprachausgabe, z.B. "en-US"
 * @property {string} angelegt
 * @property {Vokabel[]} vokabeln
 */
export function setAnlegen(rohdaten = {}) {
  return {
    id: rohdaten.id || neueId('set'),
    name: (rohdaten.name || 'Neues Lernset').trim(),
    sprache: rohdaten.sprache || 'Englisch',
    sprachcode: rohdaten.sprachcode || 'en-US',
    angelegt: rohdaten.angelegt || new Date().toISOString(),
    vokabeln: (rohdaten.vokabeln || []).map(vokabelAnlegen)
  };
}

/** Das Wort inklusive Artikel, wie es angezeigt werden soll. */
export function vollesWort(vokabel) {
  return vokabel.artikel ? `${vokabel.artikel} ${vokabel.wort}` : vokabel.wort;
}

/** Gibt es ein Bild, das als Gedächtnisanker taugt? */
export function hatBild(vokabel) {
  return Boolean(vokabel.bild && vokabel.bild.wert);
}

/** Eigene Tondatei hinterlegt? (Sprachausgabe ist davon unabhängig möglich.) */
export function hatTondatei(vokabel) {
  return Boolean(vokabel.ton && vokabel.ton.art === 'datei' && vokabel.ton.wert);
}

/** Ab diesem Wert gilt ein Wort als beherrscht. */
export const KOENNEN_BEHERRSCHT = 80;

/** @param {Vokabel} vokabel */
export function istBeherrscht(vokabel) {
  return vokabel.statistik.koennen >= KOENNEN_BEHERRSCHT;
}

/**
 * Verrechnet ein Abrufergebnis mit dem Lernstatus.
 *
 * Selbstständiger Abruf zählt deutlich stärker als einer mit Hinweisen –
 * so steigt ein Wort nur dann auf "beherrscht", wenn es wirklich sitzt.
 *
 * @param {number} koennen bisheriger Wert 0..100
 * @param {{richtig: boolean, hinweise?: number, schreibfehler?: boolean, gewicht?: number}} ergebnis
 * @returns {number} neuer Wert 0..100
 */
export function koennenFortschreiben(koennen, ergebnis) {
  const gewicht = ergebnis.gewicht ?? 1;
  let aenderung;
  if (ergebnis.richtig) {
    const abzug = Math.min(3, ergebnis.hinweise || 0) * 4;   // 0, 4, 8, 12
    aenderung = Math.max(3, (18 - abzug)) * gewicht;
    if (ergebnis.schreibfehler) aenderung *= 0.5;
  } else {
    aenderung = -22 * gewicht;
  }
  return Math.max(0, Math.min(100, Math.round(koennen + aenderung)));
}
