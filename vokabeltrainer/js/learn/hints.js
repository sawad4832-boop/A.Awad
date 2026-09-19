/**
 * Abgestuftes Hinweissystem.
 *
 * Stufe 1  Bild hervorheben (ohne Bild: Kategorie oder Beispielsatz)
 * Stufe 2  erster Buchstabe
 * Stufe 3  erste zwei Buchstaben
 * Stufe 4  Lösung
 *
 * Jede genutzte Stufe wird gezählt und senkt den Wert des Abrufs.
 */

import { hatBild } from '../data/vocab.js';

export const HINWEIS_STUFEN = 4;

/**
 * @param {number} stufe 1..4
 * @param {import('../data/vocab.js').Vokabel} vokabel
 * @param {string} loesung  Die gesuchte Zeichenkette
 * @returns {{stufe:number, art:'bild'|'kontext'|'buchstaben'|'loesung', text:string, muster?:string}}
 */
export function hinweis(stufe, vokabel, loesung) {
  const wort = String(loesung || '').trim();

  if (stufe === 1) {
    if (hatBild(vokabel)) {
      return { stufe, art: 'bild', text: 'Schau dir das Bild noch einmal genau an.' };
    }
    if (vokabel.beispiel) {
      return { stufe, art: 'kontext', text: vokabel.beispiel.replace(neuRegex(vokabel.wort), '…') };
    }
    return { stufe, art: 'kontext', text: vokabel.kategorie ? `Thema: ${vokabel.kategorie}` : `${wort.length} Buchstaben` };
  }

  if (stufe === 2 || stufe === 3) {
    const anzahl = stufe - 1;
    return {
      stufe,
      art: 'buchstaben',
      text: `${anzahl === 1 ? 'Erster Buchstabe' : 'Erste zwei Buchstaben'}:`,
      muster: muster(wort, anzahl)
    };
  }

  return { stufe: 4, art: 'loesung', text: wort };
}

/** "apple", 2 → "ap _ _ _" */
export function muster(wort, sichtbar) {
  return wort
    .split('')
    .map((zeichen, stelle) => {
      if (stelle < sichtbar) return zeichen;
      return /\s/.test(zeichen) ? ' ' : '_';
    })
    .join(' ');
}

function neuRegex(wort) {
  const sicher = String(wort).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(sicher, 'gi');
}
