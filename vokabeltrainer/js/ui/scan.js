/**
 * Vokabeln aus einem Foto übernehmen.
 *
 * Ablauf: Foto wählen → erkennen lassen → Ergebnis prüfen und korrigieren →
 * übernehmen. Der Prüfschritt ist bewusst nicht überspringbar: eine
 * Texterkennung liest nie fehlerfrei, und falsche Vokabeln würden sich sonst
 * mitlernen.
 */

import { el, ersetzen, balken, dialog, ansagen } from '../core/dom.js';
import { anzahlText } from '../core/format.js';
import { erkennungSuchen, claudeFehlerText } from '../data/ocr.js';
import { vokabelAnlegen } from '../data/vocab.js';
import { bildVorschlag } from '../data/bilder.js';
import { SPRACHEN } from '../data/sprachen.js';
import { bildKachel } from './gemeinsam.js';
import { symbolWaehlen } from './bildwahl.js';

/**
 * @param {Object} optionen
 * @param {string} optionen.sprache      Anzeigename der Fremdsprache
 * @param {string} optionen.sprachcode   z.B. "en-US"
 * @param {(eintraege: Object[], sprachwahl: {sprache:string, sprachcode:string}) => void} optionen.onUebernehmen
 */
export function fotoScannen({ sprache, sprachcode, onUebernehmen }) {
  const inhalt = el('div.stapel', {});
  const wahl = { sprache: sprache || 'Englisch', sprachcode: sprachcode || 'en-US' };
  let dateien = [];
  let vorschauUrls = [];
  let abbruch = null;
  let erkennung = null;
  let gesucht = false;

  const steuerung = dialog({
    titel: 'Vokabeln aus Foto',
    inhalt,
    onSchliessen: () => {
      if (abbruch) abbruch.abort();
      vorschauUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  });

  /* --- Schritt 1: Foto wählen -------------------------------------------- */
  function auswahlZeigen(meldung) {
    const vorschau = el('div.reihe', {}, dateien.map((datei, stelle) =>
      el('div.bild.bild--klein', {}, el('img', { src: vorschauUrls[stelle], alt: datei.name }))));

    const eingabe = el('input', {
      type: 'file',
      accept: erkennung ? erkennung.dateitypen.join(',') : 'image/*',
      multiple: !erkennung || erkennung.maxBilder > 1,
      style: { display: 'none' },
      onchange: (e) => {
        const grenze = erkennung ? erkennung.maxBilder : 1;
        dateien = [...e.target.files].slice(0, grenze);
        vorschauUrls.forEach((url) => URL.revokeObjectURL(url));
        vorschauUrls = dateien.map((datei) => URL.createObjectURL(datei));
        auswahlZeigen();
      }
    });

    const spracheWaehlen = el('label.reihe', { style: { alignItems: 'center', gap: '.5rem' } },
      el('span.etikett', { style: { marginBottom: '0' } }, 'Sprache der Vokabeln'),
      el('select.knopf', {
        onchange: (e) => {
          const [name, code] = e.target.value.split('|');
          wahl.sprache = name;
          wahl.sprachcode = code;
        }
      }, SPRACHEN.map(([name, code]) => el('option', {
        value: `${name}|${code}`, selected: name === wahl.sprache
      }, name)))
    );

    ersetzen(inhalt,
      el('p.leise.klein', {},
        'Fotografiere eine Vokabelliste – zum Beispiel aus dem Schulbuch oder aus deinem Heft. ' +
        'Zwei Spalten werden automatisch zugeordnet, Artikel kommen mit.'),
      meldung || null,
      gesucht && !erkennung ? nichtVerfuegbar() : null,
      spracheWaehlen,
      el('label.knopf.knopf--haupt.knopf--gross.knopf--voll', {},
        dateien.length ? 'Anderes Foto wählen' : '📷 Foto oder Bild wählen', eingabe),
      dateien.length ? vorschau : null,
      dateien.length
        ? el('button.knopf.knopf--gross.knopf--voll', {
            type: 'button', disabled: !erkennung, onclick: erkennenStarten
          }, `${anzahlText(dateien.length, 'Bild', 'Bilder')} auswerten`)
        : null,
      el('p.klein.leise', {}, hinweisZumWeg()),
      el('p.klein.leise', {},
        'Tipp: gerade von oben fotografieren, möglichst ohne Schatten. ' +
        'Auf dem iPhone kannst du den Text auch direkt im Foto markieren, kopieren ' +
        'und unter „Importieren“ einfügen.')
    );
  }

  function hinweisZumWeg() {
    if (!gesucht) return 'Bilderkennung wird vorbereitet …';
    if (!erkennung) return '';
    return 'Claude liest das Foto – auch Handschrift – und übernimmt dabei die Artikel. ' +
      'Dafür wird dein Claude-Kontingent genutzt; beim ersten Mal wird um Erlaubnis gefragt.';
  }

  /** Hinweis, wenn die Seite Claude nicht fragen darf. */
  function nichtVerfuegbar() {
    return hinweis(
      'Die Foto-Erkennung läuft über Claude und steht nur in der veröffentlichten Version der ' +
      'App zur Verfügung. Hier kannst du die Vokabeln unter „Importieren“ als Liste einfügen.',
      'warn'
    );
  }

  /* --- Schritt 2: erkennen ----------------------------------------------- */
  async function erkennenStarten() {
    if (!dateien.length || !erkennung) return;
    abbruch = new AbortController();

    const text = el('p', {}, 'Wird vorbereitet …');
    const fortschritt = el('div', {}, balken(0.05));
    ersetzen(inhalt,
      el('div.stapel', {}, text, fortschritt,
        el('button.knopf.knopf--leise', { type: 'button', onclick: () => abbruch.abort() }, 'Abbrechen')));

    try {
      const eintraege = await erkennung.lesen(dateien, {
        sprache: wahl.sprache,
        sprachcode: wahl.sprachcode,
        signal: abbruch.signal,
        onMeldung: ({ text: meldung, anteil }) => {
          text.textContent = meldung;
          ersetzen(fortschritt, balken(anteil));
        }
      });
      if (abbruch.signal.aborted) { auswahlZeigen(); return; }
      if (!eintraege.length) {
        auswahlZeigen(hinweis('Auf dem Bild war keine Vokabelliste zu erkennen. ' +
          'Versuch einen engeren Ausschnitt oder mehr Licht.', 'warn'));
        return;
      }
      pruefenZeigen(eintraege);
    } catch (fehler) {
      if (fehler && fehler.code === 'cancelled') { auswahlZeigen(); return; }
      console.warn('Texterkennung fehlgeschlagen.', fehler);
      const meldung = fehler && fehler.code
        ? claudeFehlerText(fehler)
        : 'Das Foto konnte nicht ausgewertet werden. Versuch es noch einmal ' +
          'oder füge die Vokabeln unter „Importieren“ als Text ein.';
      auswahlZeigen(hinweis(meldung, 'fehler'));
    } finally {
      abbruch = null;
    }
  }

  /* --- Schritt 3: prüfen und korrigieren --------------------------------- */
  function pruefenZeigen(eintraege) {
    const liste = el('div.setliste', {});

    function zeichnen() {
      ersetzen(liste, eintraege.map((eintrag, stelle) => zeile(eintrag, stelle)));
    }

    function zeile(eintrag, stelle) {
      const bild = el('button.knopf.knopf--leise', {
        type: 'button',
        'aria-label': 'Bild wählen',
        style: { padding: '.25rem' },
        onclick: () => symbolWaehlen({
          suchbegriff: eintrag.bedeutung,
          vorauswahl: eintrag.bild ? eintrag.bild.wert : '',
          onWahl: (neuesBild) => { eintrag.bild = neuesBild; zeichnen(); }
        })
      }, bildKachel(vokabelAnlegen(eintrag), { klein: true }));

      return el('div.karte.vokabelzeile', {},
        bild,
        el('div.vokabelzeile__text', {},
          el('div.reihe', { style: { flexWrap: 'nowrap', gap: '.4rem' } },
            el('input.feld', {
              type: 'text', value: eintrag.artikel || '', placeholder: 'Artikel',
              'aria-label': `Artikel ${stelle + 1}`,
              style: { width: '6.5rem', flex: '0 0 auto' },
              oninput: (e) => { eintrag.artikel = e.target.value; }
            }),
            el('input.feld', {
              type: 'text', value: eintrag.wort, 'aria-label': `Wort ${stelle + 1}`,
              oninput: (e) => {
                eintrag.wort = e.target.value;
                if (!eintrag.bild) eintrag.bild = bildVorschlag(eintrag.wort, eintrag.bedeutung);
              }
            })
          ),
          el('input.feld', {
            type: 'text', value: eintrag.bedeutung, 'aria-label': `Übersetzung ${stelle + 1}`,
            oninput: (e) => {
              eintrag.bedeutung = e.target.value;
              if (!eintrag.bild) eintrag.bild = bildVorschlag(eintrag.wort, eintrag.bedeutung);
            }
          })
        ),
        el('button.knopf.knopf--leise.knopf--gefahr', {
          type: 'button', 'aria-label': `Zeile ${stelle + 1} entfernen`,
          onclick: () => { eintraege.splice(stelle, 1); zeichnen(); zaehlerAktualisieren(); }
        }, '✕')
      );
    }

    const zaehler = el('span.marke', {});
    const uebernehmen = el('button.knopf.knopf--haupt.knopf--gross.knopf--voll', {
      type: 'button',
      onclick: () => {
        const gueltige = eintraege.filter((e) => e.wort.trim() && e.bedeutung.trim());
        if (!gueltige.length) return;
        steuerung.schliessen();
        onUebernehmen(gueltige, wahl);
        ansagen(`${gueltige.length} Vokabeln übernommen.`);
      }
    }, '');

    function zaehlerAktualisieren() {
      const gueltige = eintraege.filter((e) => e.wort.trim() && e.bedeutung.trim()).length;
      zaehler.textContent = anzahlText(gueltige, 'Vokabel', 'Vokabeln');
      uebernehmen.textContent = gueltige ? `${gueltige} Vokabeln übernehmen` : 'Nichts zu übernehmen';
      uebernehmen.disabled = !gueltige;
    }

    zeichnen();
    zaehlerAktualisieren();

    ersetzen(inhalt,
      el('div.session__zeile', {},
        el('span', {}, 'Erkannt – bitte kurz prüfen'),
        zaehler
      ),
      el('p.klein.leise', {}, 'Falsch gelesene Wörter kannst du hier direkt korrigieren, ' +
        'Zeilen entfernen und Bilder ändern.'),
      liste,
      el('div.reihe', {},
        el('button.knopf', {
          type: 'button',
          onclick: () => { eintraege.push({ wort: '', bedeutung: '', artikel: '', plural: '', beispiel: '', bild: null }); zeichnen(); zaehlerAktualisieren(); }
        }, '+ Zeile'),
        el('button.knopf.knopf--leise', { type: 'button', onclick: () => auswahlZeigen() }, 'Anderes Foto')
      ),
      uebernehmen
    );
  }

  function hinweis(text, art) {
    return el('div.rueckmeldung.rueckmeldung--' + art, {}, el('div.rueckmeldung__text', {}, text));
  }

  // Erkennung im Hintergrund vorbereiten, damit der Dialog sofort offen ist.
  auswahlZeigen();
  erkennungSuchen().then((gefunden) => {
    erkennung = gefunden;
    gesucht = true;
    if (!dateien.length) auswahlZeigen();
  });

  return steuerung;
}
