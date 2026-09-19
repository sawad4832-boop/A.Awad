/**
 * Vokabeln aus einem Foto übernehmen.
 *
 * Ablauf: Foto wählen → erkennen lassen → Ergebnis prüfen und korrigieren →
 * übernehmen. Der Prüfschritt ist bewusst nicht überspringbar: eine
 * Texterkennung liest nie fehlerfrei, und falsche Vokabeln würden sich sonst
 * mitlernen.
 *
 * Die Erkennung läuft über Claude und steht nicht in jeder Ansicht zur
 * Verfügung. Deshalb gibt es hier immer auch den Weg über eingefügten Text –
 * am iPhone lässt sich der Text direkt im Foto markieren und kopieren.
 */

import { el, ersetzen, balken, dialog, ansagen } from '../core/dom.js';
import { anzahlText } from '../core/format.js';
import { erkennungSuchen, claudeFehlerText, grundText, MAX_FOTOS } from '../data/ocr.js';
import { textEinlesen } from '../data/import.js';
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
  let erkennung = null;      // Ergebnis der Suche, sobald sie da ist
  let schritt = 'auswahl';

  const steuerung = dialog({
    titel: 'Vokabeln aus Foto',
    inhalt,
    onSchliessen: () => {
      if (abbruch) abbruch.abort();
      vorschauUrls.forEach((url) => URL.revokeObjectURL(url));
    }
  });

  const bereit = () => Boolean(erkennung && erkennung.status === 'bereit');

  /* --- Schritt 1: Foto wählen -------------------------------------------- */

  function auswahlZeigen(meldung) {
    schritt = 'auswahl';

    const eingabe = el('input', {
      type: 'file',
      accept: bereit() ? erkennung.dateitypen.join(',') : 'image/jpeg,image/png,image/webp',
      multiple: true,
      style: { display: 'none' },
      onchange: (e) => {
        const neue = [...e.target.files];
        const platz = Math.max(0, MAX_FOTOS - dateien.length);
        dateien = [...dateien, ...neue.slice(0, platz)];
        vorschauUrls = [...vorschauUrls, ...neue.slice(0, platz).map((datei) => URL.createObjectURL(datei))];
        e.target.value = '';   // dasselbe Foto darf erneut gewählt werden
        auswahlZeigen(neue.length > platz
          ? hinweis(`Es können höchstens ${MAX_FOTOS} Fotos auf einmal ausgewertet werden.`, 'warn')
          : null);
      }
    });

    // Genau eine Meldung: entweder die übergebene oder der Grund, warum die
    // Erkennung hier nicht geht.
    const kopfmeldung = meldung
      || (erkennung && !bereit() ? hinweis(grundText(erkennung.status), 'warn') : null);

    ersetzen(inhalt,
      el('p.leise.klein', {},
        'Fotografiere eine Vokabelliste – zum Beispiel aus dem Schulbuch oder aus deinem Heft. ' +
        'Zwei Spalten werden automatisch zugeordnet, Artikel kommen mit.'),
      el('p.klein.leise', {},
        `Mehrere Seiten? Füge nacheinander weitere Fotos hinzu – bis zu ${MAX_FOTOS} Seiten werden ` +
        'zusammen ausgewertet und doppelte Vokabeln dabei zusammengeführt.'),
      kopfmeldung,
      spracheWaehlen(),

      el('label.knopf' + (dateien.length ? '' : '.knopf--haupt') + '.knopf--gross.knopf--voll', {},
        dateien.length ? '+ Weiteres Foto hinzufügen' : '📷 Foto oder Bild wählen', eingabe),
      dateien.length ? vorschauReihe() : null,
      dateien.length
        ? el('button.knopf.knopf--haupt.knopf--gross.knopf--voll', {
            type: 'button', onclick: erkennenStarten
          }, dateien.length === 1 ? 'Foto auswerten' : `${dateien.length} Seiten auswerten`)
        : null,
      dateien.length > 1
        ? el('button.knopf.knopf--leise.klein', { type: 'button', onclick: alleEntfernen }, 'Alle entfernen')
        : null,

      el('p.klein.leise', {}, hinweisZumWeg()),
      el('button.knopf.knopf--voll', { type: 'button', onclick: () => einfuegenZeigen() }, '⌨️ Text einfügen statt Foto')
    );
  }

  function vorschauReihe() {
    return el('div.reihe', {}, dateien.map((datei, stelle) =>
      el('div', { style: { position: 'relative' } },
        el('div.bild.bild--klein', {}, el('img', { src: vorschauUrls[stelle], alt: `Seite ${stelle + 1}` })),
        el('span.klein.leise', { style: { display: 'block', textAlign: 'center' } }, `Seite ${stelle + 1}`),
        el('button.knopf.knopf--leise.knopf--gefahr', {
          type: 'button',
          'aria-label': `Seite ${stelle + 1} entfernen`,
          style: {
            position: 'absolute', top: '-8px', right: '-8px', minHeight: 'auto',
            padding: '.1rem .35rem', background: 'var(--flaeche)'
          },
          onclick: () => {
            URL.revokeObjectURL(vorschauUrls[stelle]);
            dateien.splice(stelle, 1);
            vorschauUrls.splice(stelle, 1);
            auswahlZeigen();
          }
        }, '✕')
      )));
  }

  function alleEntfernen() {
    vorschauUrls.forEach((url) => URL.revokeObjectURL(url));
    dateien = [];
    vorschauUrls = [];
    auswahlZeigen();
  }

  function spracheWaehlen() {
    return el('label.reihe', { style: { alignItems: 'center', gap: '.5rem' } },
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
  }

  function hinweisZumWeg() {
    if (!erkennung) return 'Bilderkennung wird vorbereitet – du kannst schon Fotos auswählen.';
    if (!bereit()) return '';
    return 'Claude liest das Foto – auch Handschrift – und übernimmt dabei die Artikel. ' +
      'Dafür wird dein Claude-Kontingent genutzt; beim ersten Mal wird um Erlaubnis gefragt.';
  }

  /* --- Weg ohne Foto: Text einfügen -------------------------------------- */

  function einfuegenZeigen(meldung) {
    schritt = 'einfuegen';

    const feld = el('textarea.feld', {
      'aria-label': 'Vokabelliste einfügen',
      placeholder: 'la casa – das Haus\nel perro – der Hund\nel libro – das Buch',
      style: { minHeight: '180px' }
    });

    const uebernehmen = el('button.knopf.knopf--haupt.knopf--gross.knopf--voll', {
      type: 'button',
      onclick: () => {
        const eintraege = textEinlesen(feld.value).eintraege;
        if (!eintraege.length) {
          einfuegenZeigen(hinweis('Darin konnte ich keine Vokabelpaare erkennen. Zwischen Wort und ' +
            'Übersetzung sollte ein Trennzeichen stehen – ein Gedankenstrich, Tabulator oder Semikolon.', 'warn'));
          return;
        }
        pruefenZeigen(eintraege);
      }
    }, 'Vokabeln erkennen');

    ersetzen(inhalt,
      meldung || null,
      el('p.leise.klein', {},
        'Am iPhone geht das ohne Umweg: Foto in der Fotos-App öffnen, auf das Textsymbol unten ' +
        'rechts tippen, den Text markieren, kopieren – und hier einfügen. Das erkennt auch ' +
        'Handschrift und funktioniert ohne Claude.'),
      el('p.klein.leise', {},
        'Eine Vokabel pro Zeile, getrennt durch „–“, „-“, Tabulator, „;“ oder „=“. ' +
        'Artikel am Wortanfang (la, el, the, der …) werden automatisch erkannt.'),
      spracheWaehlen(),
      feld,
      uebernehmen,
      el('button.knopf.knopf--leise.knopf--voll', { type: 'button', onclick: () => auswahlZeigen() }, '← Zurück zum Foto')
    );
    feld.focus();
  }

  /* --- Schritt 2: erkennen ----------------------------------------------- */

  async function erkennenStarten() {
    if (!dateien.length || schritt === 'liest') return;
    schritt = 'liest';
    abbruch = new AbortController();

    const text = el('p', {}, bereit() ? 'Wird vorbereitet …' : 'Bilderkennung wird vorbereitet …');
    const fortschritt = el('div', {}, balken(0.05));
    ersetzen(inhalt,
      el('div.stapel', {}, text, fortschritt,
        el('button.knopf.knopf--leise', { type: 'button', onclick: () => abbruch.abort() }, 'Abbrechen')));

    // Die Anbindung meldet sich erst kurz nach dem Laden der Seite. Wer schneller
    // tippt, wartet hier – der Knopf darf nie wirkungslos sein.
    if (!erkennung) erkennung = await suche;
    if (!bereit()) {
      auswahlZeigen(hinweis(grundText(erkennung.status), 'warn'));
      abbruch = null;
      return;
    }
    if (abbruch.signal.aborted) { auswahlZeigen(); abbruch = null; return; }

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
      const teilErgebnis = (fehler && fehler.teilErgebnis) || [];
      if (fehler && fehler.code === 'cancelled') {
        if (teilErgebnis.length) pruefenZeigen(teilErgebnis, 'Abgebrochen – das bisher Gelesene steht hier.');
        else auswahlZeigen();
        return;
      }
      console.warn('Texterkennung fehlgeschlagen.', fehler);
      const meldung = fehler && fehler.code
        ? claudeFehlerText(fehler)
        : 'Das Foto konnte nicht ausgewertet werden. Versuch es noch einmal ' +
          'oder füge den Text ein.';
      if (teilErgebnis.length) {
        pruefenZeigen(teilErgebnis, 'Nicht alle Seiten konnten gelesen werden: ' + meldung);
      } else {
        auswahlZeigen(hinweis(meldung, 'fehler'));
      }
    } finally {
      abbruch = null;
    }
  }

  /* --- Schritt 3: prüfen und korrigieren --------------------------------- */

  function pruefenZeigen(eintraege, warnung) {
    schritt = 'pruefen';
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
      warnung ? hinweis(warnung, 'warn') : null,
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
          onclick: () => {
            eintraege.push({ wort: '', bedeutung: '', artikel: '', plural: '', beispiel: '', bild: null });
            zeichnen();
            zaehlerAktualisieren();
          }
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
  const suche = erkennungSuchen();

  auswahlZeigen();

  suche.then((gefunden) => {
    erkennung = gefunden;
    // Nur neu zeichnen, solange die Auswahl zu sehen ist – sonst würde eine
    // bereits geöffnete Prüfliste überschrieben.
    if (schritt === 'auswahl') auswahlZeigen();
  });

  return steuerung;
}
