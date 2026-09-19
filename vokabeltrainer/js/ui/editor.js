/** Lernset bearbeiten: Vokabeln anlegen, Bilder und Ton ergänzen, importieren. */

import { el, dialog, ersetzen, ansagen } from '../core/dom.js';
import { anzahlText } from '../core/format.js';
import {
  setSpeichern, setLoeschen, vokabelSpeichern, vokabelLoeschen,
  vokabelnHinzufuegen, fortschrittZuruecksetzen
} from '../core/store.js';
import { vokabelAnlegen, hatBild } from '../data/vocab.js';
import { textEinlesen } from '../data/import.js';
import { bildVorschlag } from '../data/bilder.js';
import { bildKachel, tonKnopf, leerzustand } from './gemeinsam.js';
import { symbolWaehlen, bildVerkleinern, dateiAlsDatenUrl } from './bildwahl.js';
import { sprechen, sprachausgabeMoeglich } from '../audio/speech.js';
import { SPRACHEN } from '../data/sprachen.js';
import { fotoScannen } from './scan.js';

/**
 * @param {import('../data/vocab.js').Lernset} set
 * @param {{zurueck:()=>void, neuZeichnen:()=>void, lernen:(setId:string)=>void}} aktionen
 * @param {{reiter?:'vokabeln'|'import'}} [ansicht]
 */
export function editorSeite(set, aktionen, ansicht = {}) {
  const reiter = ansicht.reiter || 'vokabeln';

  const kopf = el('div.stapel.stapel--eng', {},
    el('div.reihe', {},
      el('button.knopf.knopf--leise', { type: 'button', onclick: aktionen.zurueck }, '← Start')
    ),
    el('input.feld', {
      type: 'text', value: set.name, 'aria-label': 'Name des Lernsets',
      style: { fontSize: '1.4rem', fontWeight: '650' },
      onchange: (e) => { setSpeichern({ ...set, name: e.target.value.trim() || set.name }); aktionen.neuZeichnen(); }
    }),
    el('div.reihe', {},
      spracheWaehlen(set, aktionen),
      el('span.marke', {}, anzahlText(set.vokabeln.length, 'Vokabel', 'Vokabeln'))
    )
  );

  const reiterLeiste = el('div.reiter', { role: 'tablist' },
    reiterKnopf('Vokabeln', reiter === 'vokabeln', () => zeichneMit('vokabeln')),
    reiterKnopf('Importieren', reiter === 'import', () => zeichneMit('import'))
  );

  const huelle = el('div.stapel', {}, kopf, reiterLeiste, el('div', {}));

  function zeichneMit(neuerReiter) {
    ersetzen(huelle, kopf,
      el('div.reiter', { role: 'tablist' },
        reiterKnopf('Vokabeln', neuerReiter === 'vokabeln', () => zeichneMit('vokabeln')),
        reiterKnopf('Importieren', neuerReiter === 'import', () => zeichneMit('import'))
      ),
      neuerReiter === 'vokabeln' ? vokabelBereich(set, aktionen) : importBereich(set, aktionen)
    );
  }

  zeichneMit(reiter);
  return huelle;
}

function reiterKnopf(titel, aktiv, beiKlick) {
  return el('button', { type: 'button', role: 'tab', 'aria-selected': aktiv ? 'true' : 'false', onclick: beiKlick }, titel);
}

function spracheWaehlen(set, aktionen) {
  const auswahl = el('select.knopf', {
    'aria-label': 'Sprache des Lernsets',
    onchange: (e) => {
      const [sprache, sprachcode] = e.target.value.split('|');
      setSpeichern({ ...set, sprache, sprachcode });
      aktionen.neuZeichnen();
    }
  }, SPRACHEN.map(([name, code]) => el('option', {
    value: `${name}|${code}`,
    selected: name === set.sprache
  }, name)));
  return auswahl;
}

/* --- Vokabelliste --------------------------------------------------------- */

function vokabelBereich(set, aktionen) {
  return el('div.stapel', {},
    el('div.reihe', {},
      el('button.knopf.knopf--haupt', {
        type: 'button',
        onclick: () => vokabelDialog(set, null, aktionen)
      }, '+ Vokabel hinzufügen'),
      el('button.knopf', { type: 'button', onclick: () => scanStarten(set, aktionen) }, '📷 Aus Foto'),
      set.vokabeln.length
        ? el('button.knopf', { type: 'button', onclick: () => aktionen.lernen(set.id) }, 'Lernen')
        : null
    ),

    set.vokabeln.length
      ? el('div.setliste', {}, set.vokabeln.map((vokabel) => vokabelZeile(set, vokabel, aktionen)))
      : leerzustand('Noch keine Vokabeln. Lege einzelne Wörter an oder füge eine ganze Liste über „Importieren“ ein.'),

    el('div.karte.stapel.stapel--eng', { style: { padding: '1rem' } },
      el('h3', { style: { fontSize: '1rem' } }, 'Lernset verwalten'),
      el('div.reihe', {},
        el('button.knopf.knopf--leise', {
          type: 'button',
          onclick: () => {
            if (confirm('Alle Lernstände dieses Sets zurücksetzen? Die Vokabeln bleiben erhalten.')) {
              fortschrittZuruecksetzen(set.id);
              aktionen.neuZeichnen();
            }
          }
        }, 'Fortschritt zurücksetzen'),
        el('button.knopf.knopf--leise.knopf--gefahr', {
          type: 'button',
          onclick: () => {
            if (confirm(`„${set.name}“ mit allen Vokabeln löschen?`)) {
              setLoeschen(set.id);
              aktionen.zurueck();
            }
          }
        }, 'Lernset löschen')
      )
    )
  );
}

function vokabelZeile(set, vokabel, aktionen) {
  const stand = vokabel.statistik;
  const abrufe = stand.richtig + stand.falsch;

  return el('article.karte.vokabelzeile', {},
    bildKachel(vokabel, { klein: true }),
    el('div.vokabelzeile__text', {},
      el('div.vokabelzeile__wort', {}, (vokabel.artikel ? vokabel.artikel + ' ' : '') + vokabel.wort),
      el('div.set__meta', {}, vokabel.bedeutung),
      abrufe
        ? el('div.klein.leise', {}, `${stand.koennen}/100 · ${stand.richtig} richtig, ${stand.falsch} falsch` +
            (stand.schreibfehler ? `, ${stand.schreibfehler} Schreibfehler` : ''))
        : el('div.klein.leise', {}, 'noch nicht abgefragt')
    ),
    el('div.set__aktionen', {},
      tonKnopf(vokabel, set.sprachcode, { text: '' }),
      el('button.knopf.knopf--leise', { type: 'button', onclick: () => vokabelDialog(set, vokabel, aktionen) }, 'Bearbeiten'),
      el('button.knopf.knopf--leise.knopf--gefahr', {
        type: 'button', 'aria-label': `${vokabel.wort} löschen`,
        onclick: () => {
          if (confirm(`„${vokabel.wort}“ löschen?`)) { vokabelLoeschen(set.id, vokabel.id); aktionen.neuZeichnen(); }
        }
      }, '✕')
    )
  );
}

/* --- Vokabel anlegen/bearbeiten ------------------------------------------ */

function vokabelDialog(set, vorhanden, aktionen) {
  const entwurf = vokabelAnlegen(vorhanden ? { ...vorhanden } : {});

  const bildbereich = el('div.reihe', {});
  const felder = {};

  const feld = (name, beschriftung, optionen = {}) => {
    const eingabe = el(optionen.mehrzeilig ? 'textarea.feld' : 'input.feld', {
      type: 'text', value: entwurf[name] || '', placeholder: optionen.platzhalter || '',
      oninput: (e) => {
        entwurf[name] = e.target.value;
        if ((name === 'wort' || name === 'bedeutung') && !entwurf.bild) bildVorschlagSetzen();
      }
    });
    felder[name] = eingabe;
    return el('label', {}, el('span.etikett', {}, beschriftung), eingabe);
  };

  function bildVorschlagSetzen() {
    const vorschlag = bildVorschlag(entwurf.wort, entwurf.bedeutung);
    if (vorschlag) { entwurf.bild = vorschlag; bildZeichnen(); }
  }

  function bildZeichnen() {
    ersetzen(bildbereich,
      bildKachel(entwurf, { klein: true }),
      el('div.reihe', {},
        el('button.knopf', {
          type: 'button',
          onclick: () => symbolWaehlen({
            vorauswahl: entwurf.bild && entwurf.bild.art === 'emoji' ? entwurf.bild.wert : '',
            suchbegriff: entwurf.bedeutung || entwurf.wort,
            onWahl: (bild) => { entwurf.bild = bild; bildZeichnen(); }
          })
        }, 'Symbol wählen'),
        el('label.knopf', {}, 'Foto hochladen', el('input', {
          type: 'file', accept: 'image/*', style: { display: 'none' },
          onchange: async (e) => {
            const datei = e.target.files && e.target.files[0];
            if (!datei) return;
            try {
              entwurf.bild = { art: 'data', wert: await bildVerkleinern(datei), beschreibung: entwurf.bedeutung };
              bildZeichnen();
            } catch (fehler) {
              alert(fehler.message);
            }
          }
        })),
        hatBild(entwurf)
          ? el('button.knopf.knopf--leise', { type: 'button', onclick: () => { entwurf.bild = null; bildZeichnen(); } }, 'Entfernen')
          : null
      )
    );
  }

  bildZeichnen();

  const tonbereich = el('div.reihe', {},
    el('button.knopf', {
      type: 'button', disabled: !sprachausgabeMoeglich(),
      onclick: () => sprechen(entwurf.wort, set.sprachcode)
    }, '🔊 Aussprache testen'),
    el('label.knopf', {}, 'Eigene Tondatei', el('input', {
      type: 'file', accept: 'audio/*', style: { display: 'none' },
      onchange: async (e) => {
        const datei = e.target.files && e.target.files[0];
        if (!datei) return;
        entwurf.ton = { art: 'datei', wert: await dateiAlsDatenUrl(datei) };
        ansagen('Tondatei übernommen.');
      }
    }))
  );

  const formular = el('form.stapel', {
    onsubmit: (e) => {
      e.preventDefault();
      if (!entwurf.wort.trim() || !entwurf.bedeutung.trim()) {
        alert('Wort und Übersetzung werden benötigt.');
        return;
      }
      vokabelSpeichern(set.id, entwurf);
      steuerung.schliessen();
      aktionen.neuZeichnen();
    }
  },
    feld('wort', `Wort (${set.sprache})`, { platzhalter: 'apple' }),
    feld('bedeutung', 'Übersetzung', { platzhalter: 'Apfel' }),
    el('div.gitter-2', {},
      feld('artikel', 'Artikel (optional)', { platzhalter: 'the / la' }),
      feld('plural', 'Plural (optional)', { platzhalter: 'apples' })
    ),
    feld('beispiel', 'Beispielsatz (optional)', { platzhalter: 'She eats an apple.', mehrzeilig: false }),
    el('div.gitter-2', {},
      feld('kategorie', 'Thema (optional)', { platzhalter: 'Obst' }),
      el('label', {}, el('span.etikett', {}, 'Schwierigkeit'),
        el('select.feld', { onchange: (e) => { entwurf.schwierigkeit = Number(e.target.value); } },
          [[1, 'leicht'], [2, 'normal'], [3, 'schwer']].map(([wert, titel]) =>
            el('option', { value: String(wert), selected: entwurf.schwierigkeit === wert }, titel))
        )
      )
    ),
    el('div', {}, el('span.etikett', {}, 'Bild – der Gedächtnisanker'), bildbereich),
    el('div', {}, el('span.etikett', {}, 'Aussprache'), tonbereich),
    el('div.reihe.reihe--ende', {},
      el('button.knopf.knopf--leise', { type: 'button', onclick: () => steuerung.schliessen() }, 'Abbrechen'),
      el('button.knopf.knopf--haupt', { type: 'submit' }, 'Speichern')
    )
  );

  const steuerung = dialog({ titel: vorhanden ? 'Vokabel bearbeiten' : 'Neue Vokabel', inhalt: formular });
  return steuerung;
}

/** Öffnet die Foto-Erkennung und hängt das Ergebnis an das Lernset an. */
export function scanStarten(set, aktionen) {
  return fotoScannen({
    sprache: set.sprache,
    sprachcode: set.sprachcode,
    onUebernehmen: (eintraege, sprachwahl) => {
      if (sprachwahl && sprachwahl.sprache !== set.sprache) {
        setSpeichern({ ...set, sprache: sprachwahl.sprache, sprachcode: sprachwahl.sprachcode });
      }
      vokabelnHinzufuegen(set.id, eintraege);
      aktionen.neuZeichnen();
    }
  });
}

/* --- Import --------------------------------------------------------------- */

function importBereich(set, aktionen) {
  const vorschau = el('div.stapel.stapel--eng', {});
  let eintraege = [];

  const eingabe = el('textarea.feld', {
    placeholder: 'apple – Apfel\nhouse – Haus\ntree – Baum\nwindow – Fenster\nchair – Stuhl',
    'aria-label': 'Vokabelliste einfügen',
    oninput: (e) => auswerten(e.target.value)
  });

  function auswerten(text) {
    const ergebnis = textEinlesen(text);
    eintraege = ergebnis.eintraege;
    ersetzen(vorschau,
      el('div.session__zeile', {},
        el('span', {}, eintraege.length
          ? `${anzahlText(eintraege.length, 'Vokabel erkannt', 'Vokabeln erkannt')}`
          : 'Noch nichts erkannt.'),
        ergebnis.uebersprungen.length
          ? el('span.marke.marke--warn', {}, `${ergebnis.uebersprungen.length} Zeilen übersprungen`)
          : null
      ),
      el('div.setliste', {}, eintraege.slice(0, 8).map((eintrag) =>
        el('div.karte.vokabelzeile', {},
          bildKachel(vokabelAnlegen(eintrag), { klein: true }),
          el('div.vokabelzeile__text', {},
            el('div.vokabelzeile__wort', {}, eintrag.wort),
            el('div.set__meta', {}, eintrag.bedeutung)
          ),
          el('span.marke', {}, eintrag.bild ? 'Bild' : 'ohne Bild')
        ))),
      eintraege.length > 8 ? el('p.klein.leise', {}, `… und ${eintraege.length - 8} weitere`) : null,
      el('button.knopf.knopf--haupt', {
        type: 'button', disabled: !eintraege.length,
        onclick: () => {
          vokabelnHinzufuegen(set.id, eintraege);
          ansagen(`${eintraege.length} Vokabeln hinzugefügt.`);
          aktionen.neuZeichnen();
        }
      }, eintraege.length ? `${eintraege.length} Vokabeln übernehmen` : 'Vokabeln übernehmen')
    );
  }

  auswerten('');

  return el('div.stapel', {},
    el('div.karte.stapel', { style: { padding: '1.15rem' } },
      el('h3', { style: { fontSize: '1.05rem' } }, 'Foto abfotografieren'),
      el('p.klein.leise', {}, 'Eine Vokabelliste aus dem Buch oder dem Heft fotografieren – ' +
        'die Wortpaare werden erkannt und vor dem Übernehmen zum Prüfen angezeigt.'),
      el('button.knopf.knopf--haupt.knopf--gross', {
        type: 'button', onclick: () => scanStarten(set, aktionen)
      }, '📷 Foto auswerten')
    ),
    el('div.karte.stapel', { style: { padding: '1.15rem' } },
      el('h3', { style: { fontSize: '1.05rem' } }, 'Liste einfügen'),
      el('p.klein.leise', {}, 'Eine Vokabel pro Zeile, getrennt durch „–“, „-“, Tab, „;“ oder „=“. ' +
        'Ein dritter Teil wird als Beispielsatz übernommen. Passende Symbole werden automatisch vorgeschlagen.'),
      eingabe,
      el('div.reihe', {},
        el('label.knopf', {}, 'CSV-Datei wählen', el('input', {
          type: 'file', accept: '.csv,.txt,text/csv,text/plain', style: { display: 'none' },
          onchange: async (e) => {
            const datei = e.target.files && e.target.files[0];
            if (!datei) return;
            const text = await datei.text();
            eingabe.value = text;
            auswerten(text);
          }
        })),
        el('span.klein.leise', {}, 'CSV mit Kopfzeile: wort;bedeutung;artikel;plural;beispiel;kategorie;bild')
      )
    ),
    el('div.karte.stapel', { style: { padding: '1.15rem' } },
      el('h3', { style: { fontSize: '1.05rem' } }, 'Vorschau'),
      vorschau
    )
  );
}
