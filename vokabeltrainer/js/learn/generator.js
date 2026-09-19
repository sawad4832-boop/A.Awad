/**
 * Aufgaben-Generator.
 *
 * Entscheidet, welche Übungsart ein Wort als nächstes bekommt, und baut daraus
 * eine fertige Aufgabenbeschreibung. Die Oberfläche muss die Lernlogik dadurch
 * nicht kennen – sie stellt nur dar, was hier beschrieben wird.
 */

import { ARTEN, art as artHolen, PRODUKTIV } from './modes.js';
import { hatBild, hatTondatei, vollesWort } from '../data/vocab.js';

/**
 * Welche Übungsarten sind für dieses Wort überhaupt möglich?
 * @returns {string[]}
 */
export function moeglicheArten(vokabel, kontext) {
  const moeglich = ['bedeutung-wort', 'wort-bedeutung', 'schreiben', 'karteikarte'];
  if (hatBild(vokabel)) moeglich.unshift('bild-wort');
  if (kontext.wahlMoeglich) moeglich.push('wort-bedeutung-wahl');
  if (kontext.tonVerfuegbar || hatTondatei(vokabel)) moeglich.push('hoeren-schreiben');
  return moeglich;
}

/**
 * Wählt die Übungsart für den nächsten Abruf.
 *
 * Leitgedanke: Was am schlechtesten sitzt, kommt dran. Direkt nach der
 * Einführung wird eher erkannt, später eher produziert und geschrieben.
 *
 * @param {import('./scheduler.js').PlanEintrag} eintrag
 * @param {{tonVerfuegbar:boolean, wahlMoeglich:boolean, letzteGlobaleArt:string|null, zufall:()=>number}} kontext
 * @returns {string} Art-ID
 */
export function artWaehlen(eintrag, kontext) {
  const zufall = kontext.zufall || Math.random;
  const vokabel = eintrag.vokabel;
  const moeglich = moeglicheArten(vokabel, kontext);

  // Erste Begegnung mit einem unbekannten Wort: kurz einprägen.
  if (eintrag.gesehen === 0 && vokabel.statistik.koennen < 40) return 'lernkarte';

  // Genau das wiederholen, was zuletzt nicht saß.
  if (eintrag.erzwungeneArt && moeglich.includes(eintrag.erzwungeneArt)) return eintrag.erzwungeneArt;

  let beste = moeglich[0];
  let besteBewertung = Infinity;

  for (const id of moeglich) {
    const punkte = eintrag.artPunkte[id] || 0;
    const fehler = eintrag.artFehler[id] || 0;
    const produktiv = PRODUKTIV.includes(id);

    // Niedrige Bewertung = wird eher gewählt.
    let bewertung = punkte * 1.6 - fehler * 2;

    // Frühe Abrufe eher erkennend, spätere eher produktiv und schreibend.
    if (eintrag.punkte < 1) bewertung += produktiv ? 1.1 : -0.4;
    else bewertung += produktiv ? -0.5 : 0.6;

    // Schreiben gezielt, wenn es dort schon Schreibfehler gab.
    if (id === 'schreiben' && eintrag.schreibfehler > 0) bewertung -= 1.6;

    // Abwechslung: nicht zweimal dieselbe Art hintereinander.
    if (id === eintrag.letzteArt) bewertung += 2.5;
    if (id === kontext.letzteGlobaleArt) bewertung += 0.8;
    if (id === 'wort-bedeutung-wahl' && (eintrag.artPunkte['wort-bedeutung'] || 0) > 0) bewertung += 1;

    bewertung += zufall() * 0.9;

    if (bewertung < besteBewertung) {
      besteBewertung = bewertung;
      beste = id;
    }
  }
  return beste;
}

/**
 * @typedef {Object} Aufgabe
 * @property {string} artId
 * @property {import('./modes.js').Uebungsart} art
 * @property {import('../data/vocab.js').Vokabel} vokabel
 * @property {import('./scheduler.js').PlanEintrag} eintrag
 * @property {string} frage
 * @property {string} loesung          Erwartete Eingabe
 * @property {string} loesungAnzeige   Lösung inklusive Artikel
 * @property {string} [reizText]       Großer Text auf der Vorderseite
 * @property {boolean} zeigtBild
 * @property {boolean} zeigtBedeutung
 * @property {boolean} tonZuerst       Ton automatisch abspielen
 * @property {Array<{text:string, richtig:boolean}>} [optionen]
 */

/**
 * Baut die konkrete Aufgabe.
 * @param {import('./scheduler.js').PlanEintrag} eintrag
 * @param {string} artId
 * @param {{rundenVokabeln: import('../data/vocab.js').Vokabel[], zufall:()=>number}} kontext
 * @returns {Aufgabe}
 */
export function aufgabeBauen(eintrag, artId, kontext) {
  const vokabel = eintrag.vokabel;
  const art = artHolen(artId);
  const zufall = kontext.zufall || Math.random;

  /** @type {Aufgabe} */
  const aufgabe = {
    artId,
    art,
    vokabel,
    eintrag,
    frage: art.frage,
    loesung: vokabel.wort,
    loesungAnzeige: vollesWort(vokabel),
    zeigtBild: false,
    zeigtBedeutung: false,
    tonZuerst: false
  };

  switch (artId) {
    case 'lernkarte':
      aufgabe.zeigtBild = true;
      aufgabe.zeigtBedeutung = true;
      aufgabe.tonZuerst = true;
      break;

    case 'bild-wort':
      aufgabe.zeigtBild = true;
      aufgabe.frage = 'Wie heißt das?';
      break;

    case 'bedeutung-wort':
      aufgabe.reizText = vokabel.bedeutung;
      aufgabe.frage = `Wie heißt „${vokabel.bedeutung}“ auf ${kontext.sprache || 'Fremdsprache'}?`;
      break;

    case 'wort-bedeutung':
      aufgabe.reizText = vollesWort(vokabel);
      aufgabe.frage = 'Was bedeutet das?';
      aufgabe.loesung = vokabel.bedeutung;
      aufgabe.loesungAnzeige = vokabel.bedeutung;
      break;

    case 'wort-bedeutung-wahl': {
      aufgabe.reizText = vollesWort(vokabel);
      aufgabe.frage = 'Was bedeutet das?';
      aufgabe.loesung = vokabel.bedeutung;
      aufgabe.loesungAnzeige = vokabel.bedeutung;
      aufgabe.optionen = antwortOptionen(vokabel, kontext.rundenVokabeln, zufall);
      break;
    }

    case 'schreiben':
      aufgabe.zeigtBild = hatBild(vokabel);
      aufgabe.zeigtBedeutung = true;
      aufgabe.frage = `Schreibe das Wort auf ${kontext.sprache || 'Fremdsprache'}.`;
      break;

    case 'karteikarte':
      aufgabe.zeigtBild = hatBild(vokabel);
      aufgabe.frage = hatBild(vokabel)
        ? `Was ist das auf ${kontext.sprache || 'Fremdsprache'}?`
        : `Was heißt „${vokabel.bedeutung}“?`;
      break;

    case 'hoeren-schreiben':
      aufgabe.frage = 'Höre das Wort und schreibe es.';
      aufgabe.tonZuerst = true;
      break;

    default:
      break;
  }

  return aufgabe;
}

/** Vier Antwortmöglichkeiten: die richtige Bedeutung und drei Ablenker. */
export function antwortOptionen(vokabel, rundenVokabeln, zufall = Math.random) {
  const ablenker = rundenVokabeln
    .filter((v) => v.id !== vokabel.id && v.bedeutung && v.bedeutung !== vokabel.bedeutung)
    .map((v) => v.bedeutung);

  const gemischt = mischen([...new Set(ablenker)], zufall).slice(0, 3);
  const optionen = [{ text: vokabel.bedeutung, richtig: true }, ...gemischt.map((text) => ({ text, richtig: false }))];
  return mischen(optionen, zufall);
}

/** Fisher-Yates */
export function mischen(liste, zufall = Math.random) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

export { ARTEN };
