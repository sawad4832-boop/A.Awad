/**
 * Übungsarten.
 *
 * Jede Art trainiert eine andere Abrufrichtung. Der Aufgaben-Generator wählt
 * anhand dieser Beschreibung, welche Übung für ein Wort gerade sinnvoll ist.
 *
 *   richtung  'einfuehrung' – erste Begegnung (nur einmal pro Wort)
 *             'produktion'  – Wort selbst herstellen (tippen)
 *             'erkennen'    – Bedeutung erkennen
 *             'schreiben'   – korrekte Schreibweise
 *             'hoeren'      – Klangbild
 */

/**
 * @typedef {Object} Uebungsart
 * @property {string} id
 * @property {string} titel
 * @property {string} frage
 * @property {'einfuehrung'|'produktion'|'erkennen'|'schreiben'|'hoeren'} richtung
 * @property {'weiter'|'text'|'wahl'|'bewertung'} eingabe
 * @property {boolean} brauchtBild
 * @property {boolean} brauchtTon
 * @property {boolean} streng    Schreibfehler zählen als Fehler statt als Tippfehler
 * @property {number} gewicht    Einfluss auf den Lernstatus
 */

/** @type {Object<string, Uebungsart>} */
export const ARTEN = {
  lernkarte: {
    id: 'lernkarte',
    titel: 'Neues Wort',
    frage: 'Präge dir Bild, Wort und Klang ein.',
    richtung: 'einfuehrung',
    eingabe: 'weiter',
    brauchtBild: false,
    brauchtTon: false,
    streng: false,
    gewicht: 0
  },
  'bild-wort': {
    id: 'bild-wort',
    titel: 'Bild → Wort',
    frage: 'Wie heißt das?',
    richtung: 'produktion',
    eingabe: 'text',
    brauchtBild: true,
    brauchtTon: false,
    streng: false,
    gewicht: 1.1
  },
  'bedeutung-wort': {
    id: 'bedeutung-wort',
    titel: 'Übersetzung → Fremdsprache',
    frage: 'Wie heißt das Wort in der Fremdsprache?',
    richtung: 'produktion',
    eingabe: 'text',
    brauchtBild: false,
    brauchtTon: false,
    streng: false,
    gewicht: 1.1
  },
  'wort-bedeutung': {
    id: 'wort-bedeutung',
    titel: 'Fremdsprache → Bedeutung',
    frage: 'Was bedeutet das?',
    richtung: 'erkennen',
    eingabe: 'text',
    brauchtBild: false,
    brauchtTon: false,
    streng: false,
    gewicht: 0.9
  },
  'wort-bedeutung-wahl': {
    id: 'wort-bedeutung-wahl',
    titel: 'Fremdsprache → Bedeutung',
    frage: 'Was bedeutet das?',
    richtung: 'erkennen',
    eingabe: 'wahl',
    brauchtBild: false,
    brauchtTon: false,
    streng: false,
    gewicht: 0.7
  },
  schreiben: {
    id: 'schreiben',
    titel: 'Schreiben',
    frage: 'Schreibe das Wort.',
    richtung: 'schreiben',
    eingabe: 'text',
    brauchtBild: false,
    brauchtTon: false,
    streng: true,
    gewicht: 1.2
  },
  karteikarte: {
    id: 'karteikarte',
    titel: 'Karteikarte',
    frage: 'Erst selbst überlegen, dann aufdecken.',
    richtung: 'erkennen',
    eingabe: 'bewertung',
    brauchtBild: false,
    brauchtTon: false,
    streng: false,
    gewicht: 0.6
  },
  'hoeren-schreiben': {
    id: 'hoeren-schreiben',
    titel: 'Hören → Schreiben',
    frage: 'Höre das Wort und schreibe es.',
    richtung: 'hoeren',
    eingabe: 'text',
    brauchtBild: false,
    brauchtTon: true,
    streng: true,
    gewicht: 1.2
  }
};

/** Übungsarten, die in einer Runde abgefragt werden (ohne Einführung). */
export const ABFRAGE_ARTEN = [
  'bild-wort', 'bedeutung-wort', 'wort-bedeutung', 'wort-bedeutung-wahl',
  'schreiben', 'karteikarte', 'hoeren-schreiben'
];

/** Arten, bei denen das fremdsprachliche Wort produziert werden muss. */
export const PRODUKTIV = ['bild-wort', 'bedeutung-wort', 'schreiben', 'hoeren-schreiben'];

/** @param {string} id @returns {Uebungsart} */
export function art(id) {
  return ARTEN[id] || ARTEN.karteikarte;
}
