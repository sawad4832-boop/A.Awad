/** Gemeinsam genutzte Bausteine der Oberfläche. */

import { el, balken } from '../core/dom.js';
import { vokabelSprechen, tonMoeglich } from '../audio/speech.js';
import { hatBild } from '../data/vocab.js';

/**
 * Bildkachel einer Vokabel – der Gedächtnisanker.
 * @param {import('../data/vocab.js').Vokabel} vokabel
 * @param {{klein?:boolean, hervorheben?:boolean}} [optionen]
 */
export function bildKachel(vokabel, optionen = {}) {
  const klassen = 'div.bild' + (optionen.klein ? '.bild--klein' : '') + (optionen.hervorheben ? '.bild--hinweis' : '');
  const beschreibung = (vokabel.bild && vokabel.bild.beschreibung) || vokabel.bedeutung || '';

  if (!hatBild(vokabel)) {
    return el(klassen, { 'aria-hidden': 'true' }, el('span.bild__emoji.leise', {}, '🗒️'));
  }
  if (vokabel.bild.art === 'emoji') {
    return el(klassen, { role: 'img', 'aria-label': beschreibung }, el('span.bild__emoji', {}, vokabel.bild.wert));
  }
  return el(klassen, {}, el('img', { src: vokabel.bild.wert, alt: beschreibung, loading: 'lazy' }));
}

/**
 * Knopf für die Aussprache.
 * @param {import('../data/vocab.js').Vokabel} vokabel
 * @param {string} sprachcode
 */
export function tonKnopf(vokabel, sprachcode, { gross = false, text = 'Aussprache' } = {}) {
  const knopf = el('button.knopf.tonknopf' + (gross ? '.tonknopf--riesig' : ''), {
    type: 'button',
    onclick: () => {
      knopf.classList.add('knopf--aktiv');
      vokabelSprechen(vokabel, sprachcode);
      setTimeout(() => knopf.classList.remove('knopf--aktiv'), 400);
    }
  }, el('span', { 'aria-hidden': 'true' }, '🔊'), text);

  if (!tonMoeglich(vokabel, sprachcode)) {
    knopf.disabled = true;
    knopf.title = 'Für diese Sprache steht im Browser keine Stimme bereit.';
  }
  return knopf;
}

/** Kennzahl-Kachel für Start- und Fortschrittsseite. */
export function kennzahl(titel, wert, zusatz) {
  return el('div.karte.kennzahl', {},
    el('div.kennzahl__wert', {}, wert),
    el('div.kennzahl__titel', {}, titel),
    zusatz ? el('div.kennzahl__titel.leise', {}, zusatz) : null
  );
}

/** Fortschrittsbalken mit Beschriftung. */
export function fortschrittsZeile(beschriftung, anteil, rechts) {
  return el('div.stapel.stapel--eng', {},
    el('div.session__zeile', {}, el('span', {}, beschriftung), rechts ? el('span.session__zaehler', {}, rechts) : null),
    balken(anteil)
  );
}

/** Einfache Tabelle aus Zeilenpaaren. */
export function tabelle(kopf, zeilen) {
  return el('table.tabelle', {},
    el('thead', {}, el('tr', {}, kopf.map((titel) => el('th', {}, titel)))),
    el('tbody', {}, zeilen.map((zeile) => el('tr', {}, zeile.map((zelle) => el('td', {}, zelle)))))
  );
}

/** Leerer Zustand mit Handlungsaufforderung. */
export function leerzustand(text, knopf) {
  return el('div.karte.leerzustand', {}, el('p.leise', {}, text), knopf || null);
}
