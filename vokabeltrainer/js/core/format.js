/** Formatierungen für Zahlen, Zeiten und Datumswerte. */

/** Ganze Sekunden als "12 min" / "1 h 05 min" / "45 s". */
export function dauerText(sekunden) {
  const s = Math.max(0, Math.round(sekunden));
  if (s < 60) return s + ' s';
  const minuten = Math.floor(s / 60);
  if (minuten < 60) return minuten + ' min';
  const stunden = Math.floor(minuten / 60);
  return stunden + ' h ' + String(minuten % 60).padStart(2, '0') + ' min';
}

/** Anteil 0..1 als Prozenttext. */
export function prozentText(anteil) {
  if (!Number.isFinite(anteil)) return '–';
  return Math.round(anteil * 100) + ' %';
}

/** Lokaler Tagesschlüssel (YYYY-MM-DD) – bewusst ohne UTC-Verschiebung. */
export function tagesSchluessel(datum = new Date()) {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, '0');
  const tag = String(datum.getDate()).padStart(2, '0');
  return `${jahr}-${monat}-${tag}`;
}

/** Differenz zweier Tagesschlüssel in Tagen. */
export function tagesAbstand(schluesselA, schluesselB) {
  const a = new Date(schluesselA + 'T00:00:00');
  const b = new Date(schluesselB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** "3 Wörter" / "1 Wort" */
export function anzahlText(anzahl, einzahl, mehrzahl) {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}
