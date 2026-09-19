/**
 * Lernsession-Ansicht.
 *
 * Stellt die von der Lernlogik gelieferte Aufgabe dar und gibt Antworten
 * zurück. Die Reihenfolge, die Übungsart und die Wiederholungen entscheidet
 * ausschließlich die Session – diese Datei kümmert sich nur um Darstellung,
 * Tastatur und Fokus.
 */

import { el, ersetzen, balken, ansagen } from '../core/dom.js';
import { vollesWort } from '../data/vocab.js';
import { vokabelSprechen, tonStoppen } from '../audio/speech.js';
import { bildKachel, tonKnopf } from './gemeinsam.js';

/**
 * @param {import('../learn/session.js').Lernsession} session
 * @param {{fertig:()=>void, abbrechen:()=>void}} aktionen
 */
export function sessionSeite(session, aktionen) {
  const kopf = el('div.session__leiste', {});
  const bereich = el('div', {});
  const huelle = el('div.session', {}, kopf, bereich);
  let abschriftVersuche = 0;

  function kopfZeichnen() {
    const stand = session.fortschritt();
    ersetzen(kopf,
      el('div.session__zeile', {},
        el('span', {}, 'Gesicherte Wörter'),
        el('span.session__zaehler', {}, `${stand.gesichert} / ${stand.gesamt}`)
      ),
      balken(stand.anteil),
      el('div.session__zeile', {},
        el('span.klein', {}, `Aufgabe ${stand.aufgaben}`),
        el('button.knopf.knopf--leise.klein', {
          type: 'button',
          onclick: () => { tonStoppen(); session.beenden(); aktionen.fertig(); }
        }, 'Runde beenden')
      )
    );
  }

  function zeichnen() {
    kopfZeichnen();
    if (session.phase !== 'abschrift') abschriftVersuche = 0;

    if (session.phase === 'fertig' || !session.aufgabe) {
      aktionen.fertig();
      return;
    }

    const aufgabe = session.aufgabe;
    const karte = el('section.karte.aufgabe', { 'aria-live': 'polite' },
      el('div.aufgabe__art', {}, aufgabe.art.titel),
      el('div.aufgabe__frage', {}, aufgabe.frage),
      ...reizTeile(aufgabe),
      ...eingabeTeile(aufgabe)
    );

    ersetzen(bereich, karte);

    if (aufgabe.tonZuerst) vokabelSprechen(aufgabe.vokabel, session.set.sprachcode);
    const ziel = karte.querySelector('input, button.wahl__option, button[data-erst]');
    if (ziel) ziel.focus();
  }

  /**
   * Nach einer richtigen Antwort automatisch weiterschalten.
   * Bricht ab, wenn der Nutzer in der Zwischenzeit selbst weitergeklickt hat.
   */
  function spaeterWeiter(verzoegerung) {
    const stand = session.aufgabenZaehler;
    setTimeout(() => {
      if (session.phase === 'rueckmeldung' && session.aufgabenZaehler === stand) {
        session.weiter();
        zeichnen();
      }
    }, verzoegerung);
  }

  /** Vorderseite: Bild, Reiztext, Ton. */
  function reizTeile(aufgabe) {
    const teile = [];
    const zeigeBild = aufgabe.zeigtBild || session.bildZeigen;

    if (aufgabe.artId === 'karteikarte' && session.phase === 'frage') {
      if (zeigeBild) teile.push(el('div.aufgabe__bild', {}, bildKachel(aufgabe.vokabel, { hervorheben: session.bildZeigen })));
      if (!aufgabe.vokabel.bild) teile.push(el('div.aufgabe__reiz', {}, aufgabe.vokabel.bedeutung));
      return teile;
    }

    if (zeigeBild) {
      teile.push(el('div.aufgabe__bild', {}, bildKachel(aufgabe.vokabel, { hervorheben: session.bildZeigen })));
    }
    if (aufgabe.reizText) teile.push(el('div.aufgabe__reiz', {}, aufgabe.reizText));
    if (aufgabe.zeigtBedeutung && aufgabe.artId !== 'lernkarte') {
      teile.push(el('div.aufgabe__zusatz', {}, aufgabe.vokabel.bedeutung));
    }
    if (aufgabe.artId === 'hoeren-schreiben') {
      teile.push(tonKnopf(aufgabe.vokabel, session.set.sprachcode, { gross: true, text: 'Noch einmal hören' }));
    }
    if (aufgabe.artId === 'wort-bedeutung' || aufgabe.artId === 'wort-bedeutung-wahl') {
      teile.push(el('div.reihe', { style: { justifyContent: 'center' } },
        tonKnopf(aufgabe.vokabel, session.set.sprachcode, { text: 'Anhören' })));
    }
    return teile;
  }

  /** Eingabebereich je nach Phase. */
  function eingabeTeile(aufgabe) {
    if (session.phase === 'abschrift') return abschriftTeile(aufgabe);
    if (session.phase === 'rueckmeldung') return [rueckmeldungsKarte(), weiterKnopf()];

    switch (aufgabe.art.eingabe) {
      case 'weiter':   return einfuehrungTeile(aufgabe);
      case 'wahl':     return wahlTeile(aufgabe);
      case 'bewertung':return karteikarteTeile(aufgabe);
      default:         return textTeile(aufgabe);
    }
  }

  /* --- Einführung -------------------------------------------------------- */
  function einfuehrungTeile(aufgabe) {
    const vokabel = aufgabe.vokabel;
    return [
      el('div.karteikarte__antwort', {},
        el('div.karteikarte__wort', {}, vollesWort(vokabel)),
        el('div', {}, vokabel.bedeutung),
        vokabel.plural ? el('div.klein.leise', {}, 'Plural: ' + vokabel.plural) : null,
        vokabel.beispiel ? el('div.klein.leise', {}, vokabel.beispiel) : null
      ),
      el('div.reihe', {},
        tonKnopf(vokabel, session.set.sprachcode, { text: 'Anhören' }),
        el('button.knopf.knopf--haupt.knopf--gross', {
          type: 'button', 'data-erst': '1',
          onclick: () => { session.einfuehrungBestaetigen(); zeichnen(); }
        }, 'Verstanden – abfragen')
      )
    ];
  }

  /* --- Texteingabe ------------------------------------------------------- */
  function textTeile(aufgabe) {
    const eingabe = el('input.feld.feld--gross', {
      type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
      'aria-label': aufgabe.frage,
      placeholder: aufgabe.artId === 'wort-bedeutung' ? 'Bedeutung eingeben' : `Wort auf ${session.set.sprache}`,
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); pruefen(); } }
    });

    const hinweisBereich = el('div', {});

    function pruefen() {
      const rueckmeldung = session.antwortGeben(eingabe.value);
      if (!rueckmeldung) { eingabe.focus(); return; }
      ansagen(rueckmeldung.titel);
      zeichnen();
      if (rueckmeldung.richtig && !rueckmeldung.schreibfehler) spaeterWeiter(900);
    }

    return [
      eingabe,
      hinweisBereich,
      el('div.reihe', {},
        el('button.knopf.knopf--haupt.knopf--gross', { type: 'button', onclick: pruefen }, 'Prüfen'),
        hinweisKnopf(hinweisBereich)
      )
    ];
  }

  /* --- Auswahl ----------------------------------------------------------- */
  function wahlTeile(aufgabe) {
    const liste = el('div.wahl', {}, (aufgabe.optionen || []).map((option, stelle) =>
      el('button.wahl__option', {
        type: 'button',
        onclick: () => {
          const rueckmeldung = session.wahlAntworten(stelle);
          ansagen(rueckmeldung.titel);
          zeichnen();
          if (rueckmeldung.richtig) spaeterWeiter(800);
        }
      }, option.text)));
    return [liste];
  }

  /* --- Karteikarte ------------------------------------------------------- */
  function karteikarteTeile(aufgabe) {
    if (session.phase === 'frage') {
      return [
        el('p.leise.klein', { style: { textAlign: 'center' } }, 'Erst selbst abrufen – dann aufdecken.'),
        el('button.knopf.knopf--haupt.knopf--gross.knopf--voll', {
          type: 'button', 'data-erst': '1',
          onclick: () => { session.karteAufdecken(); zeichnen(); }
        }, 'Antwort anzeigen')
      ];
    }

    const vokabel = aufgabe.vokabel;
    return [
      el('div.karteikarte__antwort', {},
        el('div.karteikarte__wort', {}, vollesWort(vokabel)),
        el('div', {}, vokabel.bedeutung),
        vokabel.beispiel ? el('div.klein.leise', {}, vokabel.beispiel) : null
      ),
      el('div.reihe', { style: { justifyContent: 'center' } },
        tonKnopf(vokabel, session.set.sprachcode, { text: 'Aussprache' })),
      el('div.bewertung', {},
        bewertungsKnopf('Wusste ich', 'gewusst'),
        bewertungsKnopf('War unsicher', 'unsicher'),
        bewertungsKnopf('Wusste ich nicht', 'nicht')
      )
    ];
  }

  function bewertungsKnopf(titel, wert) {
    return el('button.knopf', {
      type: 'button',
      onclick: () => {
        const rueckmeldung = session.bewerten(wert);
        ansagen(rueckmeldung.titel);
        zeichnen();
        if (wert === 'gewusst') spaeterWeiter(600);
      }
    }, titel);
  }

  /* --- Hinweise ---------------------------------------------------------- */
  function hinweisKnopf(bereich) {
    const knopf = el('button.knopf', {
      type: 'button',
      onclick: () => {
        const hinweis = session.hinweisAnfordern();
        if (!hinweis) return;
        if (hinweis.art === 'loesung') { zeichnen(); return; }
        ersetzen(bereich, el('div.hinweis', {},
          hinweis.text,
          hinweis.muster ? el('div.hinweis__luecke', {}, hinweis.muster) : null
        ));
        if (hinweis.art === 'bild') zeichnen();
        knopf.textContent = `Hinweis (${session.hinweisStufe}/4)`;
        const feld = bereich.parentElement && bereich.parentElement.querySelector('input.feld');
        if (feld) feld.focus();
      }
    }, session.hinweisStufe ? `Hinweis (${session.hinweisStufe}/4)` : 'Hinweis');
    return knopf;
  }

  /* --- Rückmeldung und Abschrift ----------------------------------------- */
  function rueckmeldungsKarte() {
    const r = session.rueckmeldung;
    if (!r) return null;
    const art = r.richtig ? (r.schreibfehler ? 'warn' : 'gut') : 'fehler';
    return el('div.rueckmeldung.rueckmeldung--' + art, {},
      el('div.rueckmeldung__titel', {}, (r.richtig ? '✓ ' : '✗ ') + r.titel),
      el('div.rueckmeldung__loesung', {}, r.loesung),
      el('div.rueckmeldung__text', {}, r.richtig && !r.schreibfehler ? r.bedeutung : r.text)
    );
  }

  function weiterKnopf() {
    return el('button.knopf.knopf--haupt.knopf--gross.knopf--voll', {
      type: 'button', 'data-erst': '1',
      onclick: () => { session.weiter(); zeichnen(); },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); session.weiter(); zeichnen(); } }
    }, 'Weiter');
  }

  function abschriftTeile() {
    const ziel = session.abschriftZiel();
    const rueckmeldung = rueckmeldungsKarte();
    const stand = el('div.klein.leise', {}, 'Tippe das Wort einmal korrekt – so prägt sich die Schreibweise ein.');
    const ueberspringen = el('div', {});

    const eingabe = el('input.feld.feld--gross', {
      type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false',
      'aria-label': 'Wort korrekt abschreiben',
      placeholder: ziel.replace(/./g, '·'),
      oninput: () => {
        if (session.abschriftPruefen(eingabe.value)) {
          eingabe.classList.add('feld--gut');
          ansagen('Richtig geschrieben.');
          setTimeout(() => { session.weiter(); zeichnen(); }, 450);
        }
      },
      onkeydown: (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (session.abschriftPruefen(eingabe.value)) { session.weiter(); zeichnen(); return; }
        abschriftVersuche += 1;
        eingabe.classList.add('feld--fehler');
        stand.textContent = `So stimmt es noch nicht. Die richtige Schreibweise lautet: ${ziel}`;
        if (abschriftVersuche >= 3) {
          ersetzen(ueberspringen, el('button.knopf.knopf--leise.klein', {
            type: 'button',
            onclick: () => { session.phase = 'rueckmeldung'; session.weiter(); zeichnen(); }
          }, 'Überspringen'));
        }
      }
    });

    return [
      rueckmeldung,
      el('div.stapel.stapel--eng', {},
        el('span.etikett', {}, `Jetzt selbst schreiben: ${ziel}`),
        eingabe,
        stand,
        ueberspringen
      )
    ];
  }

  zeichnen();
  return huelle;
}
