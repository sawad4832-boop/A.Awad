/**
 * Persistenz.
 *
 * Für den Prototyp reicht localStorage: Alle Lernsets, Vokabelstatistiken und
 * Tageswerte liegen unter einem Schlüssel. Der Rest der App spricht den
 * Speicher nur über die Funktionen hier an.
 */

import { setAnlegen, vokabelAnlegen, leereStatistik, koennenFortschreiben } from '../data/vocab.js';
import { tagesSchluessel, tagesAbstand } from './format.js';
import { beispielSets } from '../data/seed.js';

const SCHLUESSEL = 'vokabeltrainer.v1';
const abonnenten = new Set();

/** @type {AppZustand} */
let zustand = laden();

/**
 * @typedef {Object} AppZustand
 * @property {number} version
 * @property {import('../data/vocab.js').Lernset[]} sets
 * @property {Object<string, TagesWerte>} tage
 * @property {{aktuell:number, laengste:number, letzterTag:string|null}} serie
 * @property {{tonAutomatisch:boolean, rundenGroesse:number}} einstellungen
 *
 * @typedef {Object} TagesWerte
 * @property {string[]} gelernt   IDs der Wörter mit erfolgreichem Abruf
 * @property {number} sekunden
 * @property {number} richtig
 * @property {number} falsch
 * @property {number} schreibfehler
 * @property {number} hinweise
 */

function standardZustand() {
  return {
    version: 1,
    sets: beispielSets().map(setAnlegen),
    tage: {},
    serie: { aktuell: 0, laengste: 0, letzterTag: null },
    einstellungen: { tonAutomatisch: true, rundenGroesse: 10 }
  };
}

function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return standardZustand();
    const daten = JSON.parse(roh);
    return {
      version: 1,
      sets: (daten.sets || []).map(setAnlegen),
      tage: daten.tage || {},
      serie: daten.serie || { aktuell: 0, laengste: 0, letzterTag: null },
      einstellungen: { tonAutomatisch: true, rundenGroesse: 10, ...(daten.einstellungen || {}) }
    };
  } catch (fehler) {
    console.warn('Gespeicherte Daten konnten nicht gelesen werden.', fehler);
    return standardZustand();
  }
}

let speicherWarnung = false;

function sichern() {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(zustand));
  } catch (fehler) {
    if (!speicherWarnung) {
      speicherWarnung = true;
      console.warn('Speichern fehlgeschlagen – vermutlich ist der Speicher voll.', fehler);
      alert('Die Daten konnten nicht gespeichert werden. Der Browserspeicher ist voll – ' +
            'bitte einige Bilder aus den Lernsets entfernen.');
    }
  }
  for (const melden of abonnenten) melden(zustand);
}

/** @returns {AppZustand} */
export function zustandLesen() {
  return zustand;
}

/** Auf Änderungen hören. @returns {() => void} Abmeldefunktion */
export function abonnieren(melden) {
  abonnenten.add(melden);
  return () => abonnenten.delete(melden);
}

/** @returns {import('../data/vocab.js').Lernset|undefined} */
export function setLesen(setId) {
  return zustand.sets.find((s) => s.id === setId);
}

export function setSpeichern(daten) {
  const vorhanden = zustand.sets.findIndex((s) => s.id === daten.id);
  const gesichert = setAnlegen(daten);
  if (vorhanden >= 0) zustand.sets[vorhanden] = gesichert;
  else zustand.sets.push(gesichert);
  sichern();
  return gesichert;
}

export function setLoeschen(setId) {
  zustand.sets = zustand.sets.filter((s) => s.id !== setId);
  sichern();
}

export function vokabelSpeichern(setId, daten) {
  const set = setLesen(setId);
  if (!set) return null;
  const vokabel = vokabelAnlegen(daten);
  const stelle = set.vokabeln.findIndex((v) => v.id === vokabel.id);
  if (stelle >= 0) {
    vokabel.statistik = set.vokabeln[stelle].statistik;
    set.vokabeln[stelle] = vokabel;
  } else {
    set.vokabeln.push(vokabel);
  }
  sichern();
  return vokabel;
}

export function vokabelnHinzufuegen(setId, liste) {
  const set = setLesen(setId);
  if (!set) return 0;
  for (const roh of liste) set.vokabeln.push(vokabelAnlegen(roh));
  sichern();
  return liste.length;
}

export function vokabelLoeschen(setId, vokabelId) {
  const set = setLesen(setId);
  if (!set) return;
  set.vokabeln = set.vokabeln.filter((v) => v.id !== vokabelId);
  sichern();
}

export function fortschrittZuruecksetzen(setId) {
  const set = setLesen(setId);
  if (!set) return;
  for (const vokabel of set.vokabeln) vokabel.statistik = leereStatistik();
  sichern();
}

export function einstellungSetzen(name, wert) {
  zustand.einstellungen[name] = wert;
  sichern();
}

function tagHolen(schluessel) {
  if (!zustand.tage[schluessel]) {
    zustand.tage[schluessel] = {
      gelernt: [], sekunden: 0, richtig: 0, falsch: 0, schreibfehler: 0, hinweise: 0
    };
  }
  return zustand.tage[schluessel];
}

/** Lernserie fortschreiben – ein Tag mit mindestens einem Abruf zählt. */
function serieFortschreiben(heute) {
  const serie = zustand.serie;
  if (serie.letzterTag === heute) return;
  const abstand = serie.letzterTag ? tagesAbstand(serie.letzterTag, heute) : null;
  serie.aktuell = abstand === 1 ? serie.aktuell + 1 : 1;
  serie.letzterTag = heute;
  serie.laengste = Math.max(serie.laengste, serie.aktuell);
}

/**
 * Verbucht einen einzelnen Abruf – sowohl auf der Vokabel als auch im Tageskonto.
 *
 * @param {string} setId
 * @param {string} vokabelId
 * @param {Object} ergebnis
 * @param {boolean} ergebnis.richtig
 * @param {string} ergebnis.art          Übungsart
 * @param {number} [ergebnis.hinweise]
 * @param {boolean} [ergebnis.schreibfehler]
 * @param {string} [ergebnis.antwort]    Tatsächlich gegebene (falsche) Antwort
 * @param {number} [ergebnis.gewicht]
 */
export function abrufVerbuchen(setId, vokabelId, ergebnis) {
  const set = setLesen(setId);
  const vokabel = set && set.vokabeln.find((v) => v.id === vokabelId);
  if (!vokabel) return;

  const statistik = vokabel.statistik;
  const proArt = statistik.proArt[ergebnis.art] || { richtig: 0, falsch: 0 };
  const heute = tagesSchluessel();
  const tag = tagHolen(heute);

  if (ergebnis.richtig) {
    statistik.richtig += 1;
    proArt.richtig += 1;
    tag.richtig += 1;
    if (!tag.gelernt.includes(vokabelId)) tag.gelernt.push(vokabelId);
  } else {
    statistik.falsch += 1;
    proArt.falsch += 1;
    tag.falsch += 1;
    const antwort = (ergebnis.antwort || '').trim().toLowerCase();
    if (antwort) {
      statistik.verwechslungen[antwort] = (statistik.verwechslungen[antwort] || 0) + 1;
    }
  }
  if (ergebnis.schreibfehler) {
    statistik.schreibfehler += 1;
    tag.schreibfehler += 1;
  }
  if (ergebnis.hinweise) {
    statistik.hinweise += ergebnis.hinweise;
    tag.hinweise += ergebnis.hinweise;
  }

  statistik.proArt[ergebnis.art] = proArt;
  statistik.koennen = koennenFortschreiben(statistik.koennen, ergebnis);
  statistik.zuletzt = new Date().toISOString();

  serieFortschreiben(heute);
  sichern();
}

/** Lernzeit in Sekunden aufs heutige Konto buchen. */
export function lernzeitVerbuchen(sekunden) {
  if (!sekunden || sekunden < 1) return;
  tagHolen(tagesSchluessel()).sekunden += Math.round(sekunden);
  sichern();
}

/** Kompletten Datenbestand ersetzen (Import/Export). */
export function alleDatenErsetzen(daten) {
  zustand = {
    ...standardZustand(),
    ...daten,
    sets: (daten.sets || []).map(setAnlegen)
  };
  sichern();
}
