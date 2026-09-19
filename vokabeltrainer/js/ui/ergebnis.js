/** Auswertung direkt nach einer Lernsession. */

import { el, balken } from '../core/dom.js';
import { dauerText, prozentText, anzahlText } from '../core/format.js';
import { art as artHolen } from '../learn/modes.js';
import { bildKachel, kennzahl, tabelle } from './gemeinsam.js';

/**
 * @param {ReturnType<import('../learn/session.js').Lernsession['bericht']>} bericht
 * @param {import('../data/vocab.js').Lernset} set
 * @param {{nochmal:()=>void, schwache:()=>void, zurueck:()=>void}} aktionen
 */
export function ergebnisSeite(bericht, set, aktionen) {
  const alleGesichert = bericht.gesichert === bericht.gesamt;

  return el('div.stapel', {},
    el('div.start__kopf', {},
      el('h1', {}, alleGesichert ? 'Runde geschafft' : 'Runde beendet'),
      el('p.leise', {}, `${set.name} · ${dauerText(bericht.dauer)}`)
    ),

    el('div.karte.stapel', { style: { padding: '1.25rem' } },
      el('div.ergebnis__zahl', {}, `${bericht.gesichert} / ${bericht.gesamt}`),
      el('p.leise', {}, 'Wörter in dieser Runde gesichert – mehrfach und in verschiedenen Übungsarten selbst abgerufen.'),
      balken(bericht.gesamt ? bericht.gesichert / bericht.gesamt : 0, alleGesichert)
    ),

    el('div.kennzahlen', {},
      kennzahl('Trefferquote', prozentText(bericht.trefferquote), `${bericht.richtig} von ${bericht.abrufe} Abrufen`),
      kennzahl('Aufgaben', String(bericht.aufgaben)),
      kennzahl('Schreibfehler', String(bericht.schreibfehler)),
      kennzahl('Hinweise', String(bericht.hinweise))
    ),

    bericht.schwierigste.length
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Diese Wörter brauchen noch Übung'),
          el('div.setliste', {}, bericht.schwierigste.map((eintrag) => el('div.vokabelzeile', {},
            bildKachel(eintrag.vokabel, { klein: true }),
            el('div.vokabelzeile__text', {},
              el('div.vokabelzeile__wort', {}, eintrag.vokabel.wort),
              el('div.set__meta', {}, eintrag.vokabel.bedeutung),
              el('div.klein.leise', {}, beschreibeMuehe(eintrag))
            ),
            eintrag.wackelig ? el('span.marke.marke--warn', {}, 'noch wackelig') : el('span.marke', {}, 'gesichert')
          )))
        )
      : el('p.leise', {}, 'Keine Problemwörter in dieser Runde.'),

    bericht.abrufe
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Übungsarten dieser Runde'),
          tabelle(['Übungsart', 'Abrufe'], uebungsartenZaehlen(bericht))
        )
      : null,

    el('div.reihe', {},
      el('button.knopf.knopf--haupt.knopf--gross', { type: 'button', onclick: aktionen.nochmal }, 'Noch eine Runde'),
      bericht.schwierigste.length
        ? el('button.knopf.knopf--gross', { type: 'button', onclick: aktionen.schwache }, 'Nur schwierige Wörter')
        : null,
      el('button.knopf.knopf--leise.knopf--gross', { type: 'button', onclick: aktionen.zurueck }, 'Zur Startseite')
    )
  );
}

function beschreibeMuehe(eintrag) {
  const teile = [];
  if (eintrag.falsch) teile.push(anzahlText(eintrag.falsch, 'Fehler', 'Fehler'));
  if (eintrag.schreibfehler) teile.push(anzahlText(eintrag.schreibfehler, 'Schreibfehler', 'Schreibfehler'));
  if (eintrag.hinweise) teile.push(anzahlText(eintrag.hinweise, 'Hinweis', 'Hinweise'));
  return teile.join(' · ') || 'mehrfach abgefragt';
}

function uebungsartenZaehlen(bericht) {
  const zaehler = new Map();
  for (const eintrag of bericht.protokoll || []) {
    zaehler.set(eintrag.artId, (zaehler.get(eintrag.artId) || 0) + 1);
  }
  if (!zaehler.size) return [];
  return [...zaehler.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([artId, anzahl]) => [artHolen(artId).titel, String(anzahl)]);
}
