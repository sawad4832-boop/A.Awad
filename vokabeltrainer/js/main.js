/**
 * Einstiegspunkt des Vokabeltrainers.
 *
 * Aufbau des Projekts:
 *   core/      DOM-Hilfen, Speicher, Formate
 *   data/      Vokabelmodell, Beispieldaten, Bildkatalog, Import
 *   learn/     Antwortprüfung, Übungsarten, Hinweise, Aufgaben-Generator,
 *              adaptive Wiederholung, Sessionablauf
 *   audio/     Aussprache
 *   progress/  Fortschrittsberechnung
 *   ui/        Ansichten
 */

import { appStarten } from './ui/app.js';

const bereich = document.getElementById('hauptbereich');

try {
  appStarten(bereich);
} catch (fehler) {
  console.error(fehler);
  bereich.innerHTML = '<p style="padding:2rem">Die App konnte nicht gestartet werden: ' +
    String(fehler && fehler.message) + '</p>';
}
