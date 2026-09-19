/**
 * Navigation und Zusammenspiel der Ansichten.
 *
 * Die Adresse (Hash) bestimmt die Ansicht, damit die Zurück-Taste des Browsers
 * funktioniert. Neu gezeichnet wird nur, wenn es nötig ist – eine laufende
 * Lernsession darf nicht durch ein Neuzeichnen unterbrochen werden.
 */

import { ersetzen, el } from '../core/dom.js';
import { zustandLesen, setLesen, setSpeichern } from '../core/store.js';
import { Lernsession, rundeZusammenstellen } from '../learn/session.js';
import { tonStoppen } from '../audio/speech.js';
import { startseite } from './home.js';
import { editorSeite } from './editor.js';
import { sessionSeite } from './lernen.js';
import { ergebnisSeite } from './ergebnis.js';
import { fortschrittSeite } from './fortschritt.js';

/** @type {Lernsession|null} */
let laufendeSession = null;
/** @type {Object|null} */
let letzterBericht = null;
let letzteRunde = null;

let wurzel;

export function appStarten(zielElement) {
  wurzel = zielElement;
  window.addEventListener('hashchange', zeichnen);
  document.getElementById('kopf').hidden = false;
  for (const knopf of document.querySelectorAll('[data-nav]')) {
    knopf.addEventListener('click', () => gehe(knopf.dataset.nav === 'fortschritt' ? '#/fortschritt' : '#/'));
  }
  zeichnen();
}

/**
 * Zur Ansicht wechseln.
 * @param {string} ziel
 * @param {boolean} [ersetzen] true: keinen neuen Verlaufseintrag anlegen
 */
function gehe(ziel, ersetzen = false) {
  if (ersetzen) {
    window.history.replaceState(null, '', ziel);
    zeichnen();
    return;
  }
  if (window.location.hash === ziel) zeichnen();
  else window.location.hash = ziel;
}

function neuZeichnen() {
  zeichnen();
}

function navigationMarkieren(name) {
  for (const knopf of document.querySelectorAll('[data-nav]')) {
    if (knopf.dataset.nav === name) knopf.setAttribute('aria-current', 'page');
    else knopf.removeAttribute('aria-current');
  }
}

function zeichnen() {
  const zustand = zustandLesen();
  const pfad = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [ansicht, wert, zusatz] = pfad;

  if (ansicht !== 'lernen' && laufendeSession) {
    laufendeSession.beenden();
    laufendeSession = null;
    tonStoppen();
  }

  navigationMarkieren(ansicht === 'fortschritt' ? 'fortschritt' : 'start');
  window.scrollTo({ top: 0 });

  switch (ansicht) {
    case 'set': {
      const set = setLesen(wert);
      if (!set) return gehe('#/');
      return ersetzen(wurzel, editorSeite(set, {
        zurueck: () => gehe('#/'),
        neuZeichnen,
        lernen: (setId) => gehe(`#/lernen/${setId}/alle`)
      }));
    }

    case 'neu': {
      // Ersetzen statt anhängen: sonst legt ein Schritt zurück ein weiteres Set an.
      const set = setSpeichern({ name: 'Neues Lernset', sprache: 'Englisch', sprachcode: 'en-US', vokabeln: [] });
      return gehe(`#/set/${set.id}`, true);
    }

    case 'lernen':
      return sessionZeichnen(wert, zusatz || 'alle');

    case 'ergebnis': {
      if (!letzterBericht || !letzteRunde) return gehe('#/');
      const set = setLesen(letzteRunde.setId);
      if (!set) return gehe('#/');
      return ersetzen(wurzel, ergebnisSeite(letzterBericht, set, {
        nochmal: () => gehe(`#/lernen/${set.id}/${letzteRunde.modus}`),
        schwache: () => gehe(`#/lernen/${set.id}/schwach`),
        zurueck: () => gehe('#/')
      }));
    }

    case 'fortschritt':
      return ersetzen(wurzel, fortschrittSeite(zustand, {
        zurueck: () => gehe('#/'),
        lernen: (setId, modus) => gehe(`#/lernen/${setId}/${modus || 'alle'}`)
      }));

    default:
      return ersetzen(wurzel, startseite(zustand, {
        lernen: (setId, modus) => gehe(`#/lernen/${setId}/${modus || 'alle'}`),
        bearbeiten: (setId) => gehe(`#/set/${setId}`),
        neu: () => gehe('#/neu'),
        fortschritt: () => gehe('#/fortschritt')
      }));
  }
}

function sessionZeichnen(setId, modus) {
  const set = setLesen(setId);
  if (!set || !set.vokabeln.length) return gehe('#/');

  // Eine laufende Runde weiterzeichnen statt neu zu starten.
  if (!laufendeSession || letzteRunde?.setId !== setId || letzteRunde?.modus !== modus || laufendeSession.beendet) {
    const zustand = zustandLesen();
    const vokabeln = rundeZusammenstellen(set.vokabeln, zustand.einstellungen.rundenGroesse, {
      nurSchwache: modus === 'schwach'
    });
    if (!vokabeln.length) return gehe('#/');
    laufendeSession = new Lernsession({ set, vokabeln });
    letzteRunde = { setId, modus };
  }

  const session = laufendeSession;
  return ersetzen(wurzel, sessionSeite(session, {
    fertig: () => {
      letzterBericht = session.bericht();
      laufendeSession = null;
      tonStoppen();
      gehe('#/ergebnis');
    },
    abbrechen: () => gehe('#/')
  }));
}

/** Für Tests und Diagnose. */
export function aktuelleSession() {
  return laufendeSession;
}

export { el };
