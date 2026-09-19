/** Fortschrittsseite: was sitzt, was nicht, und woran es liegt. */

import { el, balken } from '../core/dom.js';
import { dauerText, prozentText, anzahlText } from '../core/format.js';
import {
  ueberblick, auswertung, setFortschritt, schwierigsteWoerter,
  haeufigsteFehler, schreibprobleme, letzteTage, fehlerProUebungsart
} from '../progress/stats.js';
import { art as artHolen } from '../learn/modes.js';
import { kennzahl, tabelle, bildKachel } from './gemeinsam.js';

/**
 * @param {import('../core/store.js').AppZustand} zustand
 * @param {{zurueck:()=>void, lernen:(setId:string, modus?:string)=>void}} aktionen
 */
export function fortschrittSeite(zustand, aktionen) {
  const zahlen = ueberblick(zustand);
  const gesamt = auswertung(zustand);
  const schwierige = schwierigsteWoerter(zustand);
  const fehler = haeufigsteFehler(zustand);
  const schreibfehler = schreibprobleme(zustand);
  const arten = fehlerProUebungsart(zustand);
  const tage = letzteTage(zustand);

  return el('div.stapel', {},
    el('div.reihe', {}, el('button.knopf.knopf--leise', { type: 'button', onclick: aktionen.zurueck }, '← Start')),
    el('div.start__kopf', {}, el('h1', {}, 'Fortschritt')),

    el('div.kennzahlen', {},
      kennzahl('heute gelernt', String(zahlen.heuteGelernt), dauerText(zahlen.heuteLernzeit)),
      kennzahl('beherrscht', `${gesamt.beherrscht}/${gesamt.gesamtWoerter}`),
      kennzahl('Trefferquote', prozentText(gesamt.trefferquote), `${gesamt.abrufe} Abrufe`),
      kennzahl('Lernzeit gesamt', dauerText(gesamt.lernzeitGesamt))
    ),

    el('section.karte.stapel', { style: { padding: '1.25rem' } },
      el('h2', { style: { fontSize: '1.1rem' } }, 'Letzte 7 Tage'),
      el('div.stapel.stapel--eng', {}, tage.map((tag) => el('div.stapel.stapel--eng', {},
        el('div.session__zeile', {},
          el('span.klein', {}, tag.datum.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })),
          el('span.klein.session__zaehler', {}, tag.woerter ? `${tag.woerter} Wörter · ${dauerText(tag.sekunden)}` : '–')
        ),
        balken(Math.min(1, tag.woerter / 20))
      )))
    ),

    el('section', {},
      el('div.abschnitt__kopf', {}, el('h2', {}, 'Lernsets')),
      el('div.setliste', {}, zustand.sets.map((set) => {
        const stand = setFortschritt(set);
        return el('article.karte.set', {},
          el('div.set__oben', {},
            el('div', {},
              el('div.set__name', {}, set.name),
              el('div.set__meta', {}, `${stand.beherrscht} von ${anzahlText(stand.gesamt, 'Vokabel', 'Vokabeln')} beherrscht`)
            ),
            el('span.marke', {}, prozentText(stand.anteil))
          ),
          balken(stand.anteil),
          el('div.set__aktionen', {},
            el('button.knopf', { type: 'button', disabled: !stand.gesamt, onclick: () => aktionen.lernen(set.id, 'alle') }, 'Lernen'),
            el('button.knopf.knopf--leise', { type: 'button', disabled: !stand.angefangen, onclick: () => aktionen.lernen(set.id, 'schwach') }, 'Schwierige wiederholen')
          )
        );
      }))
    ),

    schwierige.length
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Schwierigste Wörter'),
          el('div.setliste', {}, schwierige.map(({ set, vokabel }) => el('div.vokabelzeile', {},
            bildKachel(vokabel, { klein: true }),
            el('div.vokabelzeile__text', {},
              el('div.vokabelzeile__wort', {}, `${vokabel.wort} – ${vokabel.bedeutung}`),
              el('div.klein.leise', {}, `${set.name} · ${vokabel.statistik.falsch} Fehler` +
                (vokabel.statistik.schreibfehler ? `, ${vokabel.statistik.schreibfehler} Schreibfehler` : '') +
                (vokabel.statistik.hinweise ? `, ${vokabel.statistik.hinweise} Hinweise` : ''))
            ),
            el('span.marke' + (vokabel.statistik.koennen >= 80 ? '.marke--gut' : '.marke--fehler'), {}, `${vokabel.statistik.koennen}/100`)
          )))
        )
      : null,

    schreibfehler.length
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Häufige Schreibprobleme'),
          tabelle(['Wort', 'Schreibfehler'], schreibfehler.map(({ vokabel }) =>
            [`${vokabel.wort} (${vokabel.bedeutung})`, String(vokabel.statistik.schreibfehler)]))
        )
      : null,

    fehler.length
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Häufigste falsche Antworten'),
          tabelle(['Erwartet', 'Geantwortet', 'Anzahl'], fehler.map(({ vokabel, antwort, haeufigkeit }) =>
            [vokabel.wort, antwort, String(haeufigkeit)]))
        )
      : null,

    arten.length
      ? el('section.karte.stapel', { style: { padding: '1.25rem' } },
          el('h2', { style: { fontSize: '1.1rem' } }, 'Trefferquote nach Übungsart'),
          el('p.klein.leise', {}, 'Zeigt, welche Abrufrichtung noch Mühe macht.'),
          tabelle(['Übungsart', 'Quote'], arten.map((eintrag) =>
            [artHolen(eintrag.artId).titel, `${prozentText(eintrag.quote)} (${eintrag.richtig}/${eintrag.richtig + eintrag.falsch})`]))
        )
      : null,

    el('p.klein.leise', {}, `Lernserie: ${anzahlText(zahlen.serie, 'Tag', 'Tage')} · längste Serie: ${anzahlText(zahlen.laengsteSerie, 'Tag', 'Tage')}`)
  );
}
