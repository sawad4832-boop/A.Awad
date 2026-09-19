/**
 * Bildauswahl für eine Vokabel.
 *
 * Drei Wege: Symbol aus dem Katalog, eigenes Foto (wird verkleinert im
 * Browser gespeichert) oder eine Bildadresse.
 */

import { el, dialog } from '../core/dom.js';
import { bilderSuchen } from '../data/bilder.js';

/** Längste Kante eines gespeicherten Fotos. */
const MAX_KANTE = 640;

/**
 * Verkleinert ein hochgeladenes Bild und gibt es als Data-URL zurück.
 * Ohne Verkleinerung wäre der Browserspeicher nach wenigen Fotos voll.
 * @param {File} datei
 * @returns {Promise<string>}
 */
export function bildVerkleinern(datei) {
  return new Promise((erfuellen, ablehnen) => {
    const leser = new FileReader();
    leser.onerror = () => ablehnen(new Error('Bild konnte nicht gelesen werden.'));
    leser.onload = () => {
      const bild = new Image();
      bild.onerror = () => ablehnen(new Error('Bildformat wird nicht unterstützt.'));
      bild.onload = () => {
        const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
        const breite = Math.round(bild.width * faktor);
        const hoehe = Math.round(bild.height * faktor);
        const flaeche = document.createElement('canvas');
        flaeche.width = breite;
        flaeche.height = hoehe;
        flaeche.getContext('2d').drawImage(bild, 0, 0, breite, hoehe);
        erfuellen(flaeche.toDataURL('image/jpeg', 0.75));
      };
      bild.src = String(leser.result);
    };
    leser.readAsDataURL(datei);
  });
}

/** Liest eine Tondatei als Data-URL. */
export function dateiAlsDatenUrl(datei) {
  return new Promise((erfuellen, ablehnen) => {
    const leser = new FileReader();
    leser.onerror = () => ablehnen(new Error('Datei konnte nicht gelesen werden.'));
    leser.onload = () => erfuellen(String(leser.result));
    leser.readAsDataURL(datei);
  });
}

/**
 * Öffnet die Symbolauswahl.
 * @param {{vorauswahl?:string, suchbegriff?:string, onWahl:(bild:import('../data/vocab.js').Bild)=>void}} optionen
 */
export function symbolWaehlen({ vorauswahl = '', suchbegriff = '', onWahl }) {
  const gitter = el('div.emojiwahl', {});

  const fuellen = (suche) => {
    const treffer = bilderSuchen(suche);
    const liste = treffer.length ? treffer : bilderSuchen('');
    gitter.replaceChildren(...liste.map((emoji) => el('button', {
      type: 'button',
      'aria-pressed': emoji === vorauswahl ? 'true' : 'false',
      'aria-label': 'Symbol ' + emoji,
      onclick: () => {
        onWahl({ art: 'emoji', wert: emoji, beschreibung: suche || '' });
        steuerung.schliessen();
      }
    }, emoji)));
  };

  const suchfeld = el('input.feld', {
    type: 'search',
    placeholder: 'Suchen, z.B. Hund, apple, casa …',
    value: suchbegriff,
    oninput: (e) => fuellen(e.target.value)
  });

  fuellen(suchbegriff);

  const steuerung = dialog({
    titel: 'Symbol auswählen',
    inhalt: el('div.stapel', {},
      el('p.leise.klein', {}, 'Das Bild soll die Bedeutung möglichst eindeutig zeigen – es dient beim Abrufen als Gedächtnisanker.'),
      suchfeld,
      gitter
    )
  });
  return steuerung;
}
