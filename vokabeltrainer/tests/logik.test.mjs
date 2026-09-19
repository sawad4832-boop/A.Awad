/** Prüft die Lernlogik ohne Browser. */
import assert from 'node:assert/strict';
import { antwortPruefen, normalisieren, abstand } from '../js/learn/text.js';
import { Wiederholungsplan } from '../js/learn/scheduler.js';
import { artWaehlen, aufgabeBauen, antwortOptionen } from '../js/learn/generator.js';
import { textEinlesen } from '../js/data/import.js';
import { vokabelAnlegen, koennenFortschreiben } from '../js/data/vocab.js';
import { muster, hinweis } from '../js/learn/hints.js';

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

console.log(fehler ? `\n${fehler} Test(s) fehlgeschlagen` : '\nAlle Tests bestanden');
process.exit(fehler ? 1 : 0);
