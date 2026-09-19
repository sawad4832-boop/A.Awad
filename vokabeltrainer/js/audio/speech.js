/**
 * Audioverwaltung.
 *
 * Zwei Quellen: eine selbst hinterlegte Tondatei an der Vokabel oder die
 * Sprachausgabe des Browsers. Audio ist hier nie die einzige Lernform – es
 * begleitet Karteikarte, Einführung und die Hördiktat-Übung.
 */

import { hatTondatei, vollesWort } from '../data/vocab.js';

let stimmen = [];
let abspieler = null;

function stimmenLaden() {
  if (!('speechSynthesis' in window)) return;
  stimmen = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
  stimmenLaden();
  window.speechSynthesis.addEventListener('voiceschanged', stimmenLaden);
}

/** Gibt es überhaupt eine Sprachausgabe? */
export function sprachausgabeMoeglich() {
  return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

/** Passt eine Stimme zur gewünschten Sprache? */
export function stimmeFuer(sprachcode) {
  if (!stimmen.length) stimmenLaden();
  const code = (sprachcode || '').toLowerCase();
  const basis = code.split('-')[0];
  return stimmen.find((s) => s.lang.toLowerCase() === code)
      || stimmen.find((s) => s.lang.toLowerCase().startsWith(basis))
      || null;
}

/**
 * Kann für diese Sprache wirklich etwas abgespielt werden?
 *
 * Ohne passende Stimme werden Hörübungen gar nicht erst angeboten – eine
 * stumme Aufgabe wäre nicht lösbar.
 */
export function tonVerfuegbar(sprachcode) {
  return sprachausgabeMoeglich() && Boolean(stimmeFuer(sprachcode));
}

/** Gibt es für diese Vokabel Ton – eigene Datei oder Sprachausgabe? */
export function tonMoeglich(vokabel, sprachcode) {
  return hatTondatei(vokabel) || tonVerfuegbar(sprachcode);
}

/** Spricht einen beliebigen Text. */
export function sprechen(text, sprachcode = 'en-US', { tempo = 0.9 } = {}) {
  if (!sprachausgabeMoeglich() || !text) return false;
  try {
    window.speechSynthesis.cancel();
    const ausgabe = new window.SpeechSynthesisUtterance(String(text));
    ausgabe.lang = sprachcode;
    ausgabe.rate = tempo;
    const stimme = stimmeFuer(sprachcode);
    if (stimme) ausgabe.voice = stimme;
    window.speechSynthesis.speak(ausgabe);
    return true;
  } catch (fehler) {
    console.warn('Sprachausgabe nicht möglich.', fehler);
    return false;
  }
}

/**
 * Spielt die Aussprache einer Vokabel ab.
 * @param {import('../data/vocab.js').Vokabel} vokabel
 * @param {string} sprachcode
 * @returns {boolean} true, wenn etwas abgespielt wurde
 */
export function vokabelSprechen(vokabel, sprachcode) {
  if (hatTondatei(vokabel)) {
    try {
      if (abspieler) abspieler.pause();
      abspieler = new Audio(vokabel.ton.wert);
      abspieler.play().catch((fehler) => console.warn('Tondatei konnte nicht abgespielt werden.', fehler));
      return true;
    } catch (fehler) {
      console.warn('Tondatei konnte nicht abgespielt werden.', fehler);
    }
  }
  return sprechen(vollesWort(vokabel), sprachcode);
}

/** Laufende Ausgabe beenden (z.B. beim Verlassen der Session). */
export function tonStoppen() {
  if (sprachausgabeMoeglich()) window.speechSynthesis.cancel();
  if (abspieler) { abspieler.pause(); abspieler = null; }
}
