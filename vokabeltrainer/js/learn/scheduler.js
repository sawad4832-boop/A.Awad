/**
 * Adaptive Wiederholung innerhalb der Lernsession.
 *
 * Kein Spaced-Repetition-System: Es gibt keine Intervalle über Tage hinweg.
 * Stattdessen bekommt jedes Wort einen temporären Schwierigkeitswert ("Hitze")
 * für genau diese Runde.
 *
 *   falsch      → Hitze steigt, Wort kommt nach 2–3 anderen Aufgaben zurück
 *                 und wird in derselben Übungsart erneut geprüft
 *   wieder falsch → Hitze steigt weiter, das Wort drängt sich nach vorne
 *   richtig     → Hitze sinkt, der Abstand zur nächsten Abfrage wächst
 *
 * Ein Wort gilt als gesichert, wenn es mehrfach und in verschiedenen
 * Übungsarten selbstständig abgerufen wurde.
 */

/** Punkte, die ein Wort in der Runde sammeln muss. */
export const ZIEL_PUNKTE = 3;
/** Nach so vielen Abfragen wird ein Wort auch ohne volle Punkte losgelassen. */
export const MAX_ABFRAGEN = 9;

/**
 * @typedef {Object} PlanEintrag
 * @property {import('../data/vocab.js').Vokabel} vokabel
 * @property {number} hitze          Temporärer Schwierigkeitswert dieser Runde
 * @property {number} punkte         Fortschritt Richtung ZIEL_PUNKTE
 * @property {number} faellig        Frühester Schritt für die nächste Abfrage
 * @property {number} gesehen        Anzahl bisheriger Aufgaben
 * @property {number} richtig
 * @property {number} falsch
 * @property {number} schreibfehler
 * @property {number} hinweise
 * @property {string|null} letzteArt
 * @property {string|null} erzwungeneArt  Übungsart, die wiederholt werden muss
 * @property {Object<string, number>} artPunkte
 * @property {Object<string, number>} artFehler
 * @property {Set<string>} saubereArten
 * @property {boolean} abgeschlossen
 * @property {boolean} wackelig      Losgelassen, ohne wirklich zu sitzen
 */

export class Wiederholungsplan {
  /**
   * @param {import('../data/vocab.js').Vokabel[]} vokabeln
   * @param {{zufall?: () => number}} [optionen]
   */
  constructor(vokabeln, optionen = {}) {
    this.zufall = optionen.zufall || Math.random;
    this.schritt = 0;
    this.zuletztId = null;

    /** @type {PlanEintrag[]} */
    this.eintraege = vokabeln.map((vokabel, stelle) => ({
      vokabel,
      hitze: this.startHitze(vokabel),
      punkte: 0,
      faellig: stelle,
      gesehen: 0,
      richtig: 0,
      falsch: 0,
      schreibfehler: 0,
      hinweise: 0,
      letzteArt: null,
      erzwungeneArt: null,
      artPunkte: {},
      artFehler: {},
      sauberArten: new Set(),
      abgeschlossen: false,
      wackelig: false
    }));
  }

  /** Wörter, die bisher Mühe gemacht haben, starten mit etwas mehr Gewicht. */
  startHitze(vokabel) {
    const { koennen, falsch, richtig } = vokabel.statistik;
    let hitze = koennen >= 80 ? 0 : koennen >= 50 ? 0.4 : 0.8;
    if (falsch > richtig) hitze += 0.4;
    if (vokabel.schwierigkeit === 3) hitze += 0.3;
    return hitze;
  }

  /** @returns {PlanEintrag[]} */
  offene() {
    return this.eintraege.filter((e) => !e.abgeschlossen);
  }

  /** Anteil gesicherter Wörter (0..1) und absolute Zahlen für die Anzeige. */
  fortschritt() {
    const gesamt = this.eintraege.length;
    const gesichert = this.eintraege.filter((e) => e.abgeschlossen).length;
    return { gesichert, gesamt, anteil: gesamt ? gesichert / gesamt : 1 };
  }

  /**
   * Nächstes Wort der Runde.
   * @returns {PlanEintrag|null} null, wenn alle Wörter gesichert sind
   */
  naechster() {
    const offene = this.offene();
    if (!offene.length) return null;

    this.schritt += 1;

    let bereit = offene.filter((e) => e.faellig <= this.schritt);
    if (!bereit.length) {
      // Zeit vorspulen, bis das nächste Wort wieder dran ist.
      const naechsteZeit = Math.min(...offene.map((e) => e.faellig));
      this.schritt = Math.max(this.schritt, naechsteZeit);
      bereit = offene.filter((e) => e.faellig <= this.schritt);
    }

    // Dasselbe Wort nicht zweimal direkt hintereinander.
    if (bereit.length > 1 && this.zuletztId) {
      const ohneLetztes = bereit.filter((e) => e.vokabel.id !== this.zuletztId);
      if (ohneLetztes.length) bereit = ohneLetztes;
    }

    let gewaehlt = bereit[0];
    let besteBewertung = -Infinity;
    for (const eintrag of bereit) {
      const wartezeit = this.schritt - eintrag.faellig;
      const bewertung = eintrag.hitze * 3 + wartezeit + (eintrag.gesehen === 0 ? 1.5 : 0) + this.zufall() * 0.8;
      if (bewertung > besteBewertung) {
        besteBewertung = bewertung;
        gewaehlt = eintrag;
      }
    }

    this.zuletztId = gewaehlt.vokabel.id;
    return gewaehlt;
  }

  /**
   * Ergebnis einer Aufgabe verrechnen.
   *
   * @param {PlanEintrag} eintrag
   * @param {string} artId
   * @param {Object} ergebnis
   * @param {boolean} ergebnis.richtig
   * @param {boolean} [ergebnis.sauber]        ohne Hinweis und ohne Schreibfehler
   * @param {boolean} [ergebnis.schreibfehler]
   * @param {number}  [ergebnis.hinweise]
   * @param {'gewusst'|'unsicher'|'nicht'} [ergebnis.einschaetzung]
   * @param {boolean} [ergebnis.einfuehrung]
   */
  melden(eintrag, artId, ergebnis) {
    eintrag.gesehen += 1;
    eintrag.letzteArt = artId;
    eintrag.hinweise += ergebnis.hinweise || 0;

    if (ergebnis.einfuehrung) {
      // Direkt nach der Einführung soll früh abgefragt werden.
      eintrag.faellig = this.schritt + 1;
      eintrag.hitze = Math.max(eintrag.hitze, 0.6);
      return;
    }

    if (ergebnis.schreibfehler) eintrag.schreibfehler += 1;

    if (ergebnis.richtig) {
      eintrag.richtig += 1;
      eintrag.artPunkte[artId] = (eintrag.artPunkte[artId] || 0) + 1;

      const sauber = ergebnis.sauber !== false && !ergebnis.hinweise && !ergebnis.schreibfehler;
      const zuwachs = ergebnis.einschaetzung === 'gewusst' ? 0.6 : sauber ? 1 : 0.5;
      eintrag.punkte += zuwachs;
      if (sauber) eintrag.sauberArten.add(artId);

      eintrag.hitze = Math.max(0, eintrag.hitze - (sauber ? 0.7 : 0.3));
      eintrag.erzwungeneArt = null;
      // Später noch einmal prüfen, aber nicht sofort wieder.
      eintrag.faellig = this.schritt + 4 + Math.round(eintrag.punkte) + Math.floor(this.zufall() * 3);
    } else {
      eintrag.falsch += 1;
      eintrag.artFehler[artId] = (eintrag.artFehler[artId] || 0) + 1;
      eintrag.punkte = Math.max(0, eintrag.punkte - (ergebnis.einschaetzung === 'unsicher' ? 0.5 : 1));
      eintrag.sauberArten.delete(artId);
      eintrag.hitze += ergebnis.einschaetzung === 'unsicher' ? 1 : 2;
      // Genau das, was nicht saß, wird erneut geprüft – nach 2–3 anderen Aufgaben.
      eintrag.erzwungeneArt = artId;
      eintrag.faellig = this.schritt + 2 + Math.floor(this.zufall() * 2);
    }

    this.abschlussPruefen(eintrag);
  }

  /** Ist das Wort für diese Runde gesichert? */
  abschlussPruefen(eintrag) {
    const genugPunkte = eintrag.punkte >= ZIEL_PUNKTE;
    const genugArten = eintrag.sauberArten.size >= 2;
    const ruhig = eintrag.hitze <= 0.5;

    if (genugPunkte && genugArten && ruhig) {
      eintrag.abgeschlossen = true;
      return;
    }
    if (eintrag.gesehen >= MAX_ABFRAGEN) {
      eintrag.abgeschlossen = true;
      eintrag.wackelig = eintrag.punkte < ZIEL_PUNKTE;
    }
  }

  /** Wörter dieser Runde, sortiert nach Schwierigkeit (für die Auswertung). */
  schwierigste() {
    return [...this.eintraege]
      .filter((e) => e.falsch > 0 || e.hinweise > 0 || e.wackelig)
      .sort((a, b) => (b.falsch * 2 + b.hinweise + b.hitze) - (a.falsch * 2 + a.hinweise + a.hitze));
  }
}
