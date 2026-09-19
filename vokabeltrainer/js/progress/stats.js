/**
 * Fortschrittsberechnung.
 *
 * Reine Auswertung des gespeicherten Zustands – ohne Nebenwirkungen, damit die
 * Zahlen an jeder Stelle der Oberfläche gleich zustande kommen.
 */

import { istBeherrscht, KOENNEN_BEHERRSCHT } from '../data/vocab.js';
import { tagesSchluessel } from '../core/format.js';

/** Alle Vokabeln aller Sets. */
export function alleVokabeln(zustand) {
  return zustand.sets.flatMap((set) => set.vokabeln.map((vokabel) => ({ set, vokabel })));
}

/** Fortschritt eines einzelnen Lernsets. */
export function setFortschritt(set) {
  const gesamt = set.vokabeln.length;
  const beherrscht = set.vokabeln.filter(istBeherrscht).length;
  const koennen = gesamt
    ? set.vokabeln.reduce((summe, v) => summe + v.statistik.koennen, 0) / gesamt
    : 0;
  return {
    gesamt,
    beherrscht,
    anteil: gesamt ? koennen / 100 : 0,
    beherrschtAnteil: gesamt ? beherrscht / gesamt : 0,
    angefangen: set.vokabeln.some((v) => v.statistik.richtig + v.statistik.falsch > 0)
  };
}

/** Kennzahlen für die Startseite. */
export function ueberblick(zustand) {
  const heute = zustand.tage[tagesSchluessel()] || { gelernt: [], sekunden: 0, richtig: 0, falsch: 0 };
  const paare = alleVokabeln(zustand);
  const beherrscht = paare.filter(({ vokabel }) => istBeherrscht(vokabel)).length;

  return {
    heuteGelernt: heute.gelernt.length,
    heuteLernzeit: heute.sekunden,
    heuteRichtig: heute.richtig,
    heuteFalsch: heute.falsch,
    beherrscht,
    gesamtWoerter: paare.length,
    serie: zustand.serie.aktuell,
    laengsteSerie: zustand.serie.laengste
  };
}

/** Gesamtauswertung über alle Sets. */
export function auswertung(zustand) {
  const paare = alleVokabeln(zustand);
  let richtig = 0;
  let falsch = 0;
  let schreibfehler = 0;
  let hinweise = 0;

  for (const { vokabel } of paare) {
    richtig += vokabel.statistik.richtig;
    falsch += vokabel.statistik.falsch;
    schreibfehler += vokabel.statistik.schreibfehler;
    hinweise += vokabel.statistik.hinweise;
  }

  const abrufe = richtig + falsch;
  return {
    abrufe,
    richtig,
    falsch,
    schreibfehler,
    hinweise,
    trefferquote: abrufe ? richtig / abrufe : 0,
    beherrscht: paare.filter(({ vokabel }) => istBeherrscht(vokabel)).length,
    gesamtWoerter: paare.length,
    lernzeitGesamt: Object.values(zustand.tage).reduce((summe, tag) => summe + (tag.sekunden || 0), 0)
  };
}

/** Wörter mit den meisten Fehlern – Grundlage für gezieltes Wiederholen. */
export function schwierigsteWoerter(zustand, anzahl = 8) {
  return alleVokabeln(zustand)
    .filter(({ vokabel }) => vokabel.statistik.falsch > 0 || vokabel.statistik.schreibfehler > 0)
    .map((eintrag) => ({
      ...eintrag,
      mühe: eintrag.vokabel.statistik.falsch * 2
           + eintrag.vokabel.statistik.schreibfehler
           + eintrag.vokabel.statistik.hinweise * 0.5
    }))
    .sort((a, b) => b.mühe - a.mühe)
    .slice(0, anzahl);
}

/** Häufigste falsche Antworten über alle Wörter. */
export function haeufigsteFehler(zustand, anzahl = 8) {
  const liste = [];
  for (const { set, vokabel } of alleVokabeln(zustand)) {
    for (const [antwort, haeufigkeit] of Object.entries(vokabel.statistik.verwechslungen)) {
      liste.push({ set, vokabel, antwort, haeufigkeit });
    }
  }
  return liste.sort((a, b) => b.haeufigkeit - a.haeufigkeit).slice(0, anzahl);
}

/** Wörter mit auffällig vielen Schreibfehlern. */
export function schreibprobleme(zustand, anzahl = 6) {
  return alleVokabeln(zustand)
    .filter(({ vokabel }) => vokabel.statistik.schreibfehler > 0)
    .sort((a, b) => b.vokabel.statistik.schreibfehler - a.vokabel.statistik.schreibfehler)
    .slice(0, anzahl);
}

/** Die letzten sieben Tage für die kleine Verlaufsanzeige. */
export function letzteTage(zustand, anzahl = 7) {
  const tage = [];
  for (let zurueck = anzahl - 1; zurueck >= 0; zurueck -= 1) {
    const datum = new Date();
    datum.setDate(datum.getDate() - zurueck);
    const schluessel = tagesSchluessel(datum);
    const werte = zustand.tage[schluessel] || { gelernt: [], sekunden: 0 };
    tage.push({
      schluessel,
      datum,
      woerter: werte.gelernt.length,
      sekunden: werte.sekunden
    });
  }
  return tage;
}

/** Übungsarten, in denen die meisten Fehler passieren. */
export function fehlerProUebungsart(zustand) {
  /** @type {Object<string,{richtig:number,falsch:number}>} */
  const summe = {};
  for (const { vokabel } of alleVokabeln(zustand)) {
    for (const [artId, werte] of Object.entries(vokabel.statistik.proArt)) {
      if (!summe[artId]) summe[artId] = { richtig: 0, falsch: 0 };
      summe[artId].richtig += werte.richtig;
      summe[artId].falsch += werte.falsch;
    }
  }
  return Object.entries(summe)
    .map(([artId, werte]) => ({
      artId,
      ...werte,
      quote: werte.richtig + werte.falsch ? werte.richtig / (werte.richtig + werte.falsch) : 0
    }))
    .filter((eintrag) => eintrag.richtig + eintrag.falsch > 0)
    .sort((a, b) => a.quote - b.quote);
}

export { KOENNEN_BEHERRSCHT };
