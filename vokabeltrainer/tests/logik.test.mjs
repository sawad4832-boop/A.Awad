/** Prüft die Lernlogik ohne Browser. */
import './umgebung.mjs';
import assert from 'node:assert/strict';
import { antwortPruefen, normalisieren, abstand, artikelPruefen } from '../js/learn/text.js';
import { Wiederholungsplan } from '../js/learn/scheduler.js';
import { artWaehlen, aufgabeBauen, antwortOptionen } from '../js/learn/generator.js';
import { textEinlesen } from '../js/data/import.js';
import { vokabelAnlegen, koennenFortschreiben } from '../js/data/vocab.js';
import { muster, hinweis } from '../js/learn/hints.js';
import { entwurfAufbereiten, leseAnweisung } from '../js/data/ocr.js';
import { Lernsession } from '../js/learn/session.js';
import { setAnlegen } from '../js/data/vocab.js';

let fehler = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok  ' + name); }
  catch (e) { fehler += 1; console.log('FAIL  ' + name + '\n      ' + e.message); }
};

test('exakte Antwort ist richtig', () => {
  assert.equal(antwortPruefen('apple', 'apple').urteil, 'richtig');
  assert.equal(antwortPruefen('  Apple ', 'apple').urteil, 'richtig');
});

test('Umlaute und Akzente werden vereinheitlicht', () => {
  assert.equal(normalisieren('Käse'), 'kaese');
  assert.equal(antwortPruefen('cafe', 'café').urteil, 'richtig');
  assert.equal(antwortPruefen('Kaese', 'Käse').urteil, 'richtig');
});

test('Artikel dürfen weggelassen werden', () => {
  assert.equal(antwortPruefen('casa', 'la casa').urteil, 'richtig');
  assert.equal(antwortPruefen('the house', 'house').urteil, 'richtig');
});

test('ein Buchstabe daneben ist ein Tippfehler', () => {
  assert.equal(antwortPruefen('appel', 'apple').urteil, 'tippfehler');
  assert.equal(antwortPruefen('hous', 'house').urteil, 'tippfehler');
});

test('kurze Wörter werden nicht toleriert', () => {
  assert.equal(antwortPruefen('dig', 'dog').urteil, 'falsch');
  assert.equal(antwortPruefen('egg', 'ego').urteil, 'falsch');
});

test('echte Fehler werden nicht durchgewunken', () => {
  assert.equal(antwortPruefen('banana', 'apple').urteil, 'falsch');
  assert.equal(antwortPruefen('Maus', 'Haus').urteil, 'falsch', 'anderer Anfangsbuchstabe');
  assert.equal(antwortPruefen('cosa', 'casa').urteil, 'falsch', 'kurzes Wort');
});

test('Verwechslung schlägt Tippfehler', () => {
  const ergebnis = antwortPruefen('tree', 'three', { andereLoesungen: ['tree', 'house'] });
  assert.equal(ergebnis.urteil, 'verwechselt');
});

test('mehrere Lösungen erlaubt', () => {
  assert.equal(antwortPruefen('Schirm', 'Regenschirm / Schirm').urteil, 'richtig');
});

test('Levenshtein rechnet korrekt', () => {
  assert.equal(abstand('apple', 'appel'), 1);  // Vertauschung zählt einfach
  assert.equal(abstand('haus', 'maus'), 1);
});

test('Hinweismuster deckt schrittweise auf', () => {
  assert.equal(muster('apple', 1), 'a _ _ _ _');
  assert.equal(muster('apple', 2), 'a p _ _ _');
  assert.equal(hinweis(4, vokabelAnlegen({ wort: 'apple' }), 'apple').art, 'loesung');
});

test('Lernstatus: Hinweise zählen schwächer', () => {
  assert.ok(koennenFortschreiben(0, { richtig: true }) > koennenFortschreiben(0, { richtig: true, hinweise: 2 }));
  assert.equal(koennenFortschreiben(10, { richtig: false }), 0);
});

/* --- adaptive Wiederholung ---------------------------------------------- */

const woerter = ['apple', 'house', 'tree', 'window', 'chair'].map((wort, i) =>
  vokabelAnlegen({ id: 'v' + i, wort, bedeutung: 'B' + i, bild: { art: 'emoji', wert: '🍎' } }));

test('falsches Wort kehrt nach 2–3 Aufgaben zurück', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.5 });
  const erster = plan.naechster();
  plan.melden(erster, 'bild-wort', { richtig: false });
  const reihenfolge = [];
  for (let i = 0; i < 4; i += 1) {
    const e = plan.naechster();
    reihenfolge.push(e.vokabel.wort);
    if (e !== erster) plan.melden(e, 'bild-wort', { richtig: true, sauber: true });
  }
  const stelle = reihenfolge.indexOf(erster.vokabel.wort);
  assert.ok(stelle >= 1 && stelle <= 3, 'Wiederkehr an Position ' + stelle + ': ' + reihenfolge.join(', '));
});

test('falsche Wörter werden häufiger abgefragt als sichere', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.5 });
  const zaehler = {};
  for (let i = 0; i < 40; i += 1) {
    const e = plan.naechster();
    if (!e) break;
    zaehler[e.vokabel.wort] = (zaehler[e.vokabel.wort] || 0) + 1;
    const schwer = e.vokabel.wort === 'apple';
    plan.melden(e, 'bild-wort', schwer ? { richtig: false } : { richtig: true, sauber: true });
  }
  const andere = Object.entries(zaehler).filter(([w]) => w !== 'apple').map(([, n]) => n);
  assert.ok(zaehler.apple > Math.max(...andere),
    'apple ' + zaehler.apple + ' vs. ' + JSON.stringify(zaehler));
});

test('dieselbe Übungsart wird nach einem Fehler wiederholt', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.5 });
  const e = plan.naechster();
  plan.melden(e, 'schreiben', { richtig: false });
  assert.equal(e.erzwungeneArt, 'schreiben');
  const art = artWaehlen(e, { tonVerfuegbar: false, wahlMoeglich: true, letzteGlobaleArt: null, zufall: () => 0.5 });
  assert.equal(art, 'schreiben');
});

test('Wort gilt erst nach mehreren sauberen Abrufen in zwei Arten als gesichert', () => {
  const plan = new Wiederholungsplan([woerter[0]], { zufall: () => 0.5 });
  const e = plan.eintraege[0];
  plan.melden(e, 'bild-wort', { richtig: true, sauber: true });
  assert.equal(e.abgeschlossen, false);
  plan.melden(e, 'bild-wort', { richtig: true, sauber: true });
  plan.melden(e, 'bild-wort', { richtig: true, sauber: true });
  assert.equal(e.abgeschlossen, false, 'drei Punkte, aber nur eine Übungsart');
  plan.melden(e, 'schreiben', { richtig: true, sauber: true });
  assert.equal(e.abgeschlossen, true);
});

test('eine Runde endet auch bei ständigen Fehlern', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.3 });
  let aufgaben = 0;
  while (plan.naechster.call(plan)) {
    const e = plan.eintraege.find((x) => x.vokabel.id === plan.zuletztId);
    plan.melden(e, 'bild-wort', { richtig: false });
    aufgaben += 1;
    if (aufgaben > 200) break;
  }
  assert.ok(aufgaben <= 200, 'Runde bricht ab');
  assert.ok(plan.eintraege.every((e) => e.abgeschlossen));
});

test('erste Begegnung ist die Einführung', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.5 });
  const e = plan.naechster();
  assert.equal(artWaehlen(e, { tonVerfuegbar: true, wahlMoeglich: true, letzteGlobaleArt: null, zufall: () => 0.5 }), 'lernkarte');
});

test('Schreibfehler steuern die Schreibübung an', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.2 });
  const e = plan.eintraege[0];
  e.gesehen = 3; e.punkte = 2; e.schreibfehler = 2;
  const arten = new Set();
  for (let i = 0; i < 20; i += 1) {
    arten.add(artWaehlen(e, { tonVerfuegbar: false, wahlMoeglich: true, letzteGlobaleArt: null, zufall: Math.random }));
  }
  assert.ok(arten.has('schreiben'));
});

test('Auswahlaufgabe hat vier verschiedene Antworten', () => {
  const optionen = antwortOptionen(woerter[0], woerter, () => 0.5);
  assert.equal(optionen.length, 4);
  assert.equal(optionen.filter((o) => o.richtig).length, 1);
  assert.equal(new Set(optionen.map((o) => o.text)).size, 4);
});

test('Aufgabe Bild→Wort verrät die Bedeutung nicht', () => {
  const plan = new Wiederholungsplan(woerter, { zufall: () => 0.5 });
  const aufgabe = aufgabeBauen(plan.eintraege[0], 'bild-wort', { rundenVokabeln: woerter, sprache: 'Englisch', zufall: () => 0.5 });
  assert.equal(aufgabe.zeigtBild, true);
  assert.equal(aufgabe.zeigtBedeutung, false);
  assert.equal(aufgabe.loesung, 'apple');
});

/* --- Import -------------------------------------------------------------- */

test('Zeilenimport erkennt verschiedene Trennzeichen', () => {
  const { eintraege, uebersprungen } = textEinlesen(
    'apple – Apfel\nhouse - Haus\ntree\tBaum\nwindow;Fenster\nchair = Stuhl\nunsinn'
  );
  assert.equal(eintraege.length, 5);
  assert.equal(uebersprungen.length, 1);
  assert.equal(eintraege[0].wort, 'apple');
  assert.equal(eintraege[0].bedeutung, 'Apfel');
  assert.equal(eintraege[0].bild.wert, '🍎', 'Bild wird vorgeschlagen');
});

test('CSV mit Kopfzeile wird erkannt', () => {
  const { eintraege, art } = textEinlesen('wort;bedeutung;beispiel\n"dog";Hund;"The dog runs, fast"');
  assert.equal(art, 'csv');
  assert.equal(eintraege[0].bedeutung, 'Hund');
  assert.equal(eintraege[0].beispiel, 'The dog runs, fast');
  assert.equal(eintraege[0].bild.wert, '🐕');
});

test('Artikel werden abgetrennt', () => {
  const { eintraege } = textEinlesen('la casa – Haus');
  assert.equal(eintraege[0].artikel, 'la');
  assert.equal(eintraege[0].wort, 'casa');
});

/* --- Foto-Erkennung ------------------------------------------------------ */

test('Artikel wird aus dem Wortfeld in das Artikelfeld geholt', () => {
  const entwurf = entwurfAufbereiten({ wort: 'la casa', bedeutung: 'das Haus' });
  assert.equal(entwurf.artikel, 'la');
  assert.equal(entwurf.wort, 'casa');
  assert.equal(entwurf.bedeutung, 'das Haus', 'deutscher Artikel bleibt in der Übersetzung');
});

test('vorhandenes Artikelfeld wird übernommen', () => {
  const entwurf = entwurfAufbereiten({ wort: 'window', artikel: 'the', bedeutung: 'das Fenster' });
  assert.equal(entwurf.artikel, 'the');
  assert.equal(entwurf.wort, 'window');
});

test('Nummerierung und Satzzeichen werden entfernt', () => {
  const entwurf = entwurfAufbereiten({ wort: '12. apple', bedeutung: 'Apfel,' });
  assert.equal(entwurf.wort, 'apple');
  assert.equal(entwurf.bedeutung, 'Apfel');
  assert.equal(entwurf.bild.wert, '🍎', 'Bild wird vorgeschlagen');
});

test('unvollständige oder unsinnige Zeilen fallen weg', () => {
  assert.equal(entwurfAufbereiten({ wort: 'apple', bedeutung: '' }), null);
  assert.equal(entwurfAufbereiten({ wort: '', bedeutung: 'Apfel' }), null);
  assert.equal(entwurfAufbereiten({ wort: 'a'.repeat(70), bedeutung: 'x' }), null);
});

test('Überschriften mit Nummer werden aussortiert', () => {
  assert.equal(entwurfAufbereiten({ wort: 'Unit 3', bedeutung: 'Around the house' }), null);
  assert.equal(entwurfAufbereiten({ wort: 'Seite 12', bedeutung: 'Wortschatz' }), null);
  assert.ok(entwurfAufbereiten({ wort: 'part', bedeutung: 'Teil' }), 'echte Vokabel bleibt');
  assert.equal(entwurfAufbereiten({ wort: '42', bedeutung: 'Antwort' }), null);
});

test('Anweisung an Claude nennt die Sprache und das Format', () => {
  const anweisung = leseAnweisung('Spanisch');
  assert.match(anweisung, /Fremdsprache: Spanisch/);
  assert.match(anweisung, /JSON-Array/);
});

/* --- Artikel beim Abfragen ----------------------------------------------- */

test('fehlender und falscher Artikel werden erkannt', () => {
  assert.equal(artikelPruefen('la casa', 'la'), null);
  assert.equal(artikelPruefen('  La   casa ', 'la'), null);
  assert.equal(artikelPruefen('casa', 'la'), 'fehlt');
  assert.equal(artikelPruefen('el casa', 'la'), 'falsch');
  assert.equal(artikelPruefen('mi casa', 'la'), 'fehlt');
  assert.equal(artikelPruefen('casa', ''), null, 'ohne Artikel nichts zu prüfen');
});

/** Spielt eine Session bis zur nächsten Eingabeaufgabe nach dem Wort. */
function bisZurWortaufgabe(session) {
  for (let i = 0; i < 40; i += 1) {
    const aufgabe = session.aufgabe;
    if (!aufgabe) return null;
    if (aufgabe.artId === 'lernkarte') { session.einfuehrungBestaetigen(); continue; }
    if (aufgabe.art.eingabe === 'bewertung') { session.karteAufdecken(); session.bewerten('gewusst'); session.weiter(); continue; }
    if (aufgabe.art.eingabe === 'wahl') {
      session.wahlAntworten(aufgabe.optionen.findIndex((o) => o.richtig));
      session.weiter();
      continue;
    }
    if (aufgabe.loesung === aufgabe.vokabel.wort) return aufgabe;
    session.antwortGeben(aufgabe.loesung);
    session.weiter();
  }
  return null;
}

function spanischeSession() {
  const set = setAnlegen({
    name: 'Test', sprache: 'Spanisch', sprachcode: 'es-ES',
    vokabeln: [
      { id: 'v1', wort: 'casa', artikel: 'la', bedeutung: 'das Haus', bild: { art: 'emoji', wert: '🏠' } },
      { id: 'v2', wort: 'perro', artikel: 'el', bedeutung: 'der Hund', bild: { art: 'emoji', wert: '🐕' } },
      { id: 'v3', wort: 'libro', artikel: 'el', bedeutung: 'das Buch', bild: { art: 'emoji', wert: '📕' } },
      { id: 'v4', wort: 'sol', artikel: 'el', bedeutung: 'die Sonne', bild: { art: 'emoji', wert: '☀️' } }
    ]
  });
  return new Lernsession({ set, vokabeln: set.vokabeln, speichern: false, zufall: () => 0.5 });
}

test('Antwort ohne Artikel gilt als unvollständig', () => {
  const session = spanischeSession();
  const aufgabe = bisZurWortaufgabe(session);
  assert.ok(aufgabe, 'Wortaufgabe gefunden');

  const rueckmeldung = session.antwortGeben(aufgabe.vokabel.wort);
  assert.equal(rueckmeldung.richtig, true, 'das Wort selbst ist richtig');
  assert.equal(rueckmeldung.artikelfehler, true);
  assert.equal(session.phase, 'abschrift', 'die volle Form wird geschrieben');
  assert.equal(session.abschriftZiel(), `${aufgabe.vokabel.artikel} ${aufgabe.vokabel.wort}`);
  assert.equal(session.abschriftPruefen(aufgabe.vokabel.wort), false, 'ohne Artikel reicht nicht');
  assert.equal(session.abschriftPruefen(session.abschriftZiel()), true);
});

test('Antwort mit Artikel zählt voll', () => {
  const session = spanischeSession();
  const aufgabe = bisZurWortaufgabe(session);
  const rueckmeldung = session.antwortGeben(`${aufgabe.vokabel.artikel} ${aufgabe.vokabel.wort}`);
  assert.equal(rueckmeldung.richtig, true);
  assert.equal(rueckmeldung.artikelfehler, false);
  assert.equal(session.phase, 'rueckmeldung');
  assert.ok(aufgabe.eintrag.sauberArten.has(aufgabe.artId), 'zählt als sauberer Abruf');
});

test('falscher Artikel wird benannt', () => {
  const session = spanischeSession();
  const aufgabe = bisZurWortaufgabe(session);
  const falsch = aufgabe.vokabel.artikel === 'la' ? 'el' : 'la';
  const rueckmeldung = session.antwortGeben(`${falsch} ${aufgabe.vokabel.wort}`);
  assert.equal(rueckmeldung.artikelfehler, true);
  assert.match(rueckmeldung.titel, /Artikel stimmt nicht/);
});

test('ohne Artikel in der Vokabel bleibt alles wie bisher', () => {
  const set = setAnlegen({
    name: 'Test', sprache: 'Englisch', sprachcode: 'en-US',
    vokabeln: [
      { id: 'v1', wort: 'apple', bedeutung: 'Apfel', bild: { art: 'emoji', wert: '🍎' } },
      { id: 'v2', wort: 'house', bedeutung: 'Haus', bild: { art: 'emoji', wert: '🏠' } },
      { id: 'v3', wort: 'tree', bedeutung: 'Baum', bild: { art: 'emoji', wert: '🌳' } },
      { id: 'v4', wort: 'book', bedeutung: 'Buch', bild: { art: 'emoji', wert: '📕' } }
    ]
  });
  const session = new Lernsession({ set, vokabeln: set.vokabeln, speichern: false, zufall: () => 0.5 });
  const aufgabe = bisZurWortaufgabe(session);
  const rueckmeldung = session.antwortGeben(aufgabe.vokabel.wort);
  assert.equal(rueckmeldung.richtig, true);
  assert.equal(rueckmeldung.artikelfehler, false);
  assert.equal(session.phase, 'rueckmeldung');
});

console.log(fehler ? `\n${fehler} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(fehler ? 1 : 0);
