/** Startseite: Überblick und schneller Einstieg ins Lernen. */

import { el, balken } from '../core/dom.js';
import { dauerText, anzahlText } from '../core/format.js';
import { einstellungSetzen } from '../core/store.js';
import { ueberblick, setFortschritt } from '../progress/stats.js';
import { kennzahl, leerzustand } from './gemeinsam.js';

/**
 * @param {import('../core/store.js').AppZustand} zustand
 * @param {{lernen:(setId:string, modus?:string)=>void, bearbeiten:(setId:string)=>void,
 *          neu:()=>void, ausFoto:()=>void, fortschritt:()=>void}} aktionen
 */
export function startseite(zustand, aktionen) {
  const zahlen = ueberblick(zustand);
  const sets = zustand.sets;

  // Für den Schnellstart: das Set mit dem meisten offenen Stoff.
  const vorschlag = [...sets]
    .map((set) => ({ set, stand: setFortschritt(set) }))
    .filter(({ stand }) => stand.gesamt > 0 && stand.beherrscht < stand.gesamt)
    .sort((a, b) => b.stand.angefangen - a.stand.angefangen || a.stand.anteil - b.stand.anteil)[0];

  return el('div.stapel', {},
    el('div.start__kopf', {},
      el('h1', {}, 'Vokabeln lernen'),
      el('p.leise', {}, 'Sehen, abrufen, schreiben, hören – und schwierige Wörter sofort wiederholen.')
    ),

    el('div.kennzahlen', {},
      kennzahl('heute gelernt', String(zahlen.heuteGelernt), zahlen.heuteRichtig + zahlen.heuteFalsch + ' Abrufe'),
      kennzahl('beherrschte Wörter', `${zahlen.beherrscht}`, `von ${zahlen.gesamtWoerter}`),
      kennzahl('Lernserie', anzahlText(zahlen.serie, 'Tag', 'Tage'), zahlen.laengsteSerie > zahlen.serie ? `längste: ${zahlen.laengsteSerie}` : null),
      kennzahl('Lernzeit heute', dauerText(zahlen.heuteLernzeit))
    ),

    vorschlag
      ? el('div.karte.set', {},
          el('div.set__oben', {},
            el('div', {},
              el('div.set__name', {}, 'Weiterlernen'),
              el('div.set__meta', {}, vorschlag.set.name)
            ),
            el('span.marke', {}, `${vorschlag.stand.beherrscht}/${vorschlag.stand.gesamt} sitzen`)
          ),
          balken(vorschlag.stand.anteil),
          el('div.reihe', {},
            el('button.knopf.knopf--haupt.knopf--gross', {
              type: 'button',
              onclick: () => aktionen.lernen(vorschlag.set.id, 'alle')
            }, 'Lernen starten'),
            el('button.knopf.knopf--gross', {
              type: 'button',
              onclick: () => aktionen.lernen(vorschlag.set.id, 'schwach')
            }, 'Schwierige wiederholen'),
            rundenGroesse(zustand)
          )
        )
      : null,

    el('section', {},
      el('div.abschnitt__kopf', {},
        el('h2', {}, 'Lernsets'),
        el('div.reihe', {},
          el('button.knopf', { type: 'button', onclick: () => aktionen.ausFoto() }, '📷 Aus Foto'),
          el('button.knopf', { type: 'button', onclick: () => aktionen.neu() }, '+ Neues Lernset')
        )
      ),
      sets.length
        ? el('div.setliste', {}, sets.map((set) => setKarte(set, aktionen)))
        : leerzustand(
            'Noch kein Lernset vorhanden.',
            el('button.knopf.knopf--haupt', { type: 'button', onclick: () => aktionen.neu() }, 'Erstes Lernset anlegen')
          )
    ),

    el('div.reihe', {},
      el('button.knopf.knopf--leise', { type: 'button', onclick: () => aktionen.fortschritt() }, 'Fortschritt ansehen')
    )
  );
}

/** Wie viele neue Wörter pro Runde? Etwa 10 entsprechen 10–15 Minuten. */
function rundenGroesse(zustand) {
  return el('label.knopf.knopf--leise', { style: { gap: '.4rem' } },
    'Wörter pro Runde',
    el('select', {
      'aria-label': 'Wörter pro Runde',
      style: { border: '0', background: 'transparent', color: 'inherit', font: 'inherit' },
      onchange: (e) => einstellungSetzen('rundenGroesse', Number(e.target.value))
    }, [5, 7, 10, 15, 20].map((anzahl) => el('option', {
      value: String(anzahl),
      selected: zustand.einstellungen.rundenGroesse === anzahl
    }, String(anzahl))))
  );
}

function setKarte(set, aktionen) {
  const stand = setFortschritt(set);
  const leer = stand.gesamt === 0;

  return el('article.karte.set', {},
    el('div.set__oben', {},
      el('div', {},
        el('div.set__name', {}, set.name),
        el('div.set__meta', {}, `${set.sprache} · ${anzahlText(stand.gesamt, 'Vokabel', 'Vokabeln')}`)
      ),
      el('span.marke' + (stand.beherrschtAnteil === 1 && !leer ? '.marke--gut' : ''), {},
        leer ? 'leer' : `${stand.beherrscht}/${stand.gesamt} beherrscht`)
    ),
    balken(stand.anteil),
    el('div.set__aktionen', {},
      el('button.knopf.knopf--haupt', {
        type: 'button', disabled: leer, onclick: () => aktionen.lernen(set.id, 'alle')
      }, 'Lernen'),
      el('button.knopf', {
        type: 'button', disabled: leer || !stand.angefangen, onclick: () => aktionen.lernen(set.id, 'schwach')
      }, 'Wiederholen'),
      el('button.knopf.knopf--leise', {
        type: 'button', onclick: () => aktionen.bearbeiten(set.id)
      }, 'Bearbeiten')
    )
  );
}
