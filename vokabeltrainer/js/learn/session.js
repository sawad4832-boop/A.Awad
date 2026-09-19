/**
 * Ablauf einer Lernsession.
 *
 * Diese Klasse kennt keine Oberfläche: sie liefert die jeweils aktuelle
 * Aufgabe, nimmt Antworten entgegen, bewertet sie und schreibt die Ergebnisse
 * sowohl in den Rundenplan (adaptive Wiederholung) als auch in die dauerhafte
 * Statistik.
 *
 * Phasen einer Aufgabe:
 *   frage       – Nutzer ruft ab
 *   aufgedeckt  – Karteikarte zeigt die Lösung, Selbsteinschätzung folgt
 *   rueckmeldung– Ergebnis steht fest, "Weiter" folgt
 *   abschrift   – Nach einem Fehler muss das Wort korrekt geschrieben werden
 *   fertig      – Runde beendet
 */

import { Wiederholungsplan } from './scheduler.js';
import { artWaehlen, aufgabeBauen } from './generator.js';
import { antwortPruefen, abschriftStimmt } from './text.js';
import { hinweis, HINWEIS_STUFEN } from './hints.js';
import { abrufVerbuchen, lernzeitVerbuchen } from '../core/store.js';
import { tonVerfuegbar as sprachausgabeFuer } from '../audio/speech.js';

export class Lernsession {
  /**
   * @param {Object} optionen
   * @param {import('../data/vocab.js').Lernset} optionen.set
   * @param {import('../data/vocab.js').Vokabel[]} optionen.vokabeln  Wörter dieser Runde
   * @param {() => number} [optionen.zufall]
   * @param {boolean} [optionen.speichern]  false für Tests
   */
  constructor({ set, vokabeln, zufall = Math.random, speichern = true }) {
    this.set = set;
    this.zufall = zufall;
    this.speichern = speichern;
    this.plan = new Wiederholungsplan(vokabeln, { zufall });
    this.rundenVokabeln = vokabeln;
    this.tonVerfuegbar = sprachausgabeFuer(set.sprachcode);
    this.wahlMoeglich = vokabeln.length >= 4;

    this.startzeit = Date.now();
    this.letzteGlobaleArt = null;
    this.aufgabenZaehler = 0;
    this.zaehler = { richtig: 0, falsch: 0, schreibfehler: 0, hinweise: 0 };
    this.protokoll = [];

    /** @type {import('./generator.js').Aufgabe|null} */
    this.aufgabe = null;
    this.phase = 'frage';
    this.hinweisStufe = 0;
    this.bildZeigen = false;      // Durch Hinweis freigeschaltetes Bild
    this.rueckmeldung = null;
    this.beendet = false;

    this.naechsteAufgabe();
  }

  /** Nächste Aufgabe zusammenstellen. @returns {boolean} false, wenn die Runde vorbei ist */
  naechsteAufgabe() {
    const eintrag = this.plan.naechster();
    if (!eintrag) {
      this.aufgabe = null;
      this.phase = 'fertig';
      this.abschliessen();
      return false;
    }

    const artId = artWaehlen(eintrag, {
      tonVerfuegbar: this.tonVerfuegbar,
      wahlMoeglich: this.wahlMoeglich,
      letzteGlobaleArt: this.letzteGlobaleArt,
      zufall: this.zufall
    });

    this.aufgabe = aufgabeBauen(eintrag, artId, {
      rundenVokabeln: this.rundenVokabeln,
      sprache: this.set.sprache,
      zufall: this.zufall
    });
    this.letzteGlobaleArt = artId;
    this.aufgabenZaehler += 1;
    this.phase = 'frage';
    this.hinweisStufe = 0;
    this.bildZeigen = false;
    this.rueckmeldung = null;
    return true;
  }

  /** Fortschritt der Runde für die Anzeige. */
  fortschritt() {
    const { gesichert, gesamt, anteil } = this.plan.fortschritt();
    return { gesichert, gesamt, anteil, aufgaben: this.aufgabenZaehler };
  }

  /** Hinweis der nächsten Stufe anfordern. */
  hinweisAnfordern() {
    if (!this.aufgabe || this.phase !== 'frage') return null;
    this.hinweisStufe = Math.min(HINWEIS_STUFEN, this.hinweisStufe + 1);
    const daten = hinweis(this.hinweisStufe, this.aufgabe.vokabel, this.aufgabe.loesung);

    if (daten.art === 'bild') this.bildZeigen = true;

    if (this.hinweisStufe >= HINWEIS_STUFEN) {
      // Lösung wurde gezeigt – das zählt nicht als eigener Abruf.
      this.ergebnisVerbuchen({
        richtig: false,
        aufgeloest: true,
        antwort: '',
        text: 'Lösung angezeigt.',
        titel: 'Das Wort war weg – das ist normal.'
      });
    }
    return daten;
  }

  /** Antwort aus einem Eingabefeld prüfen. */
  antwortGeben(eingabe) {
    if (!this.aufgabe || this.phase !== 'frage') return this.rueckmeldung;
    const aufgabe = this.aufgabe;
    const andere = this.rundenVokabeln
      .filter((v) => v.id !== aufgabe.vokabel.id)
      .map((v) => (aufgabe.artId === 'wort-bedeutung' ? v.bedeutung : v.wort));

    const pruefung = antwortPruefen(eingabe, aufgabe.loesung, { andereLoesungen: andere });

    if (pruefung.urteil === 'leer') return null;

    if (pruefung.urteil === 'richtig') {
      return this.ergebnisVerbuchen({
        richtig: true,
        antwort: eingabe,
        titel: 'Richtig',
        text: aufgabe.loesungAnzeige
      });
    }

    if (pruefung.urteil === 'tippfehler') {
      const streng = aufgabe.art.streng;
      return this.ergebnisVerbuchen({
        richtig: !streng,
        schreibfehler: true,
        antwort: eingabe,
        titel: streng ? 'Fast – aber die Schreibweise stimmt nicht' : 'Fast richtig – Schreibfehler',
        text: `Du hast „${eingabe.trim()}“ geschrieben. Richtig ist „${aufgabe.loesungAnzeige}“.`
      });
    }

    const verwechselt = pruefung.urteil === 'verwechselt';
    return this.ergebnisVerbuchen({
      richtig: false,
      antwort: eingabe,
      titel: verwechselt ? 'Das ist eine andere Vokabel' : 'Noch nicht richtig',
      text: `Du hast „${eingabe.trim()}“ geschrieben. Richtig ist „${aufgabe.loesungAnzeige}“.`
    });
  }

  /** Antwort auf eine Auswahlaufgabe. */
  wahlAntworten(index) {
    if (!this.aufgabe || this.phase !== 'frage' || !this.aufgabe.optionen) return null;
    const option = this.aufgabe.optionen[index];
    if (!option) return null;
    return this.ergebnisVerbuchen({
      richtig: option.richtig,
      antwort: option.text,
      titel: option.richtig ? 'Richtig' : 'Noch nicht richtig',
      text: option.richtig ? this.aufgabe.loesungAnzeige : `Richtig ist „${this.aufgabe.loesungAnzeige}“.`
    });
  }

  /** Karteikarte umdrehen – erst danach ist die Selbsteinschätzung möglich. */
  karteAufdecken() {
    if (this.aufgabe && this.phase === 'frage') this.phase = 'aufgedeckt';
    return this.phase;
  }

  /**
   * Selbsteinschätzung auf der Karteikarte.
   * @param {'gewusst'|'unsicher'|'nicht'} einschaetzung
   */
  bewerten(einschaetzung) {
    if (!this.aufgabe || this.phase !== 'aufgedeckt') return null;
    const richtig = einschaetzung === 'gewusst';
    return this.ergebnisVerbuchen({
      richtig,
      einschaetzung,
      antwort: '',
      titel: richtig ? 'Gut – bleibt im Pool' : 'Kommt gleich noch einmal',
      text: this.aufgabe.loesungAnzeige,
      abschriftErzwingen: einschaetzung === 'nicht'
    });
  }

  /** Einführungskarte bestätigen. */
  einfuehrungBestaetigen() {
    if (!this.aufgabe || this.aufgabe.artId !== 'lernkarte') return false;
    this.plan.melden(this.aufgabe.eintrag, 'lernkarte', { richtig: true, einfuehrung: true });
    this.protokoll.push({ wortId: this.aufgabe.vokabel.id, artId: 'lernkarte', richtig: true, hinweise: 0 });
    return this.naechsteAufgabe();
  }

  /** Nach einem Fehler: das Wort einmal korrekt abschreiben. */
  abschriftPruefen(eingabe) {
    if (this.phase !== 'abschrift' || !this.aufgabe) return false;
    const ziel = this.abschriftZiel();
    if (!abschriftStimmt(eingabe, ziel)) return false;
    this.phase = 'rueckmeldung';
    return true;
  }

  /** Welches Wort muss abgeschrieben werden? */
  abschriftZiel() {
    if (!this.aufgabe) return '';
    return this.aufgabe.artId === 'wort-bedeutung' || this.aufgabe.artId === 'wort-bedeutung-wahl'
      ? this.aufgabe.vokabel.bedeutung
      : this.aufgabe.loesungAnzeige;
  }

  /** Weiter zur nächsten Aufgabe. */
  weiter() {
    if (this.phase === 'abschrift') return false;
    return this.naechsteAufgabe();
  }

  /**
   * Gemeinsame Verbuchung aller Ergebnisse.
   * @private
   */
  ergebnisVerbuchen({ richtig, antwort, titel, text, schreibfehler = false, einschaetzung, aufgeloest = false, abschriftErzwingen = false }) {
    const aufgabe = this.aufgabe;
    const hinweise = this.hinweisStufe;

    this.plan.melden(aufgabe.eintrag, aufgabe.artId, {
      richtig,
      sauber: richtig && !hinweise && !schreibfehler,
      schreibfehler,
      hinweise,
      einschaetzung
    });

    if (richtig) this.zaehler.richtig += 1; else this.zaehler.falsch += 1;
    if (schreibfehler) this.zaehler.schreibfehler += 1;
    this.zaehler.hinweise += hinweise;

    this.protokoll.push({
      wortId: aufgabe.vokabel.id,
      wort: aufgabe.vokabel.wort,
      artId: aufgabe.artId,
      richtig,
      schreibfehler,
      hinweise,
      antwort
    });

    if (this.speichern) {
      abrufVerbuchen(this.set.id, aufgabe.vokabel.id, {
        richtig,
        art: aufgabe.artId,
        hinweise,
        schreibfehler,
        antwort: richtig ? '' : antwort,
        gewicht: aufgabe.art.gewicht
      });
    }

    // Nach jedem Fehler wird die richtige Lösung einmal selbst geschrieben –
    // damit aus einem Fehler eine Korrektur wird und kein Weiterklicken.
    // Ausnahme: "War unsicher" auf der Karteikarte ist kein Fehler.
    const brauchtAbschrift = (!richtig || schreibfehler) && einschaetzung !== 'unsicher';

    this.phase = brauchtAbschrift ? 'abschrift' : 'rueckmeldung';
    this.rueckmeldung = {
      richtig,
      schreibfehler,
      aufgeloest,
      titel,
      text,
      loesung: aufgabe.loesungAnzeige,
      bedeutung: aufgabe.vokabel.bedeutung,
      abschrift: brauchtAbschrift ? this.abschriftZiel() : null
    };
    return this.rueckmeldung;
  }

  /** Runde vorzeitig beenden. */
  beenden() {
    this.phase = 'fertig';
    this.abschliessen();
  }

  /** @private Lernzeit einmalig verbuchen. */
  abschliessen() {
    if (this.beendet) return;
    this.beendet = true;
    this.dauer = Math.round((Date.now() - this.startzeit) / 1000);
    if (this.speichern) lernzeitVerbuchen(this.dauer);
  }

  /** Auswertung der Runde. */
  bericht() {
    const { gesichert, gesamt } = this.plan.fortschritt();
    const abrufe = this.zaehler.richtig + this.zaehler.falsch;
    return {
      dauer: this.dauer || Math.round((Date.now() - this.startzeit) / 1000),
      aufgaben: this.aufgabenZaehler,
      abrufe,
      richtig: this.zaehler.richtig,
      falsch: this.zaehler.falsch,
      schreibfehler: this.zaehler.schreibfehler,
      hinweise: this.zaehler.hinweise,
      trefferquote: abrufe ? this.zaehler.richtig / abrufe : 0,
      gesichert,
      gesamt,
      protokoll: this.protokoll,
      schwierigste: this.plan.schwierigste().slice(0, 5),
      wackelig: this.plan.eintraege.filter((e) => e.wackelig)
    };
  }
}

/**
 * Wählt die Wörter einer Runde aus: zuerst das, was am wenigsten sitzt.
 *
 * @param {import('../data/vocab.js').Vokabel[]} vokabeln
 * @param {number} anzahl
 * @param {{nurSchwache?: boolean, zufall?: () => number}} [optionen]
 */
export function rundeZusammenstellen(vokabeln, anzahl, optionen = {}) {
  const zufall = optionen.zufall || Math.random;
  let auswahl = [...vokabeln];

  if (optionen.nurSchwache) {
    const schwach = auswahl.filter((v) => v.statistik.koennen < 80 || v.statistik.falsch > 0);
    if (schwach.length) auswahl = schwach;
  }

  auswahl.sort((a, b) => {
    const bewertung = (v) => v.statistik.koennen - v.statistik.falsch * 5 + zufall() * 12;
    return bewertung(a) - bewertung(b);
  });

  return auswahl.slice(0, Math.max(1, anzahl));
}
