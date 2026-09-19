/**
 * Antwortprüfung.
 *
 * Grundsatz: Tippfehler werden erkannt, echte Fehler aber nicht durchgewunken.
 * Eine Antwort, die zufällig eine andere Vokabel des Sets ist, gilt immer als
 * falsch – auch wenn sie sich nur um einen Buchstaben unterscheidet.
 */

/** @typedef {'richtig'|'tippfehler'|'verwechselt'|'falsch'|'leer'} Urteil */

/** Vereinheitlicht Groß-/Kleinschreibung, Umlaute, Satzzeichen und Artikel. */
export function normalisieren(text, { artikelEntfernen = true } = {}) {
  let ergebnis = String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // é → e
    .replace(/[.,!?¡¿"'`´’()\[\]{}]/g, '')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (artikelEntfernen) {
    ergebnis = ergebnis.replace(/^(der|die|das|den|dem|ein|eine|the|a|an|to|el|la|los|las|un|una|le|il)\s+/, '');
  }
  return ergebnis;
}

/**
 * Abstand zweier Zeichenketten (Damerau-Levenshtein, optimale Ausrichtung).
 *
 * Vertauschte Nachbarn kosten nur einen Schritt – genau das ist der häufigste
 * Tippfehler: "appel" statt "apple".
 */
export function abstand(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const zeilen = [];
  for (let i = 0; i <= a.length; i += 1) zeilen.push(new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) zeilen[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) zeilen[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      let wert = Math.min(zeilen[i][j - 1] + 1, zeilen[i - 1][j] + 1, zeilen[i - 1][j - 1] + kosten);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        wert = Math.min(wert, zeilen[i - 2][j - 2] + 1);
      }
      zeilen[i][j] = wert;
    }
  }
  return zeilen[a.length][b.length];
}

/** Zerlegt eine Musterlösung in alle zulässigen Varianten ("Schirm / Regenschirm"). */
export function loesungsVarianten(loesung) {
  return String(loesung || '')
    .split(/[\/;]|,\s/)
    .map((teil) => teil.trim())
    .filter(Boolean);
}

/**
 * Prüft eine Eingabe gegen eine Musterlösung.
 *
 * @param {string} eingabe
 * @param {string} loesung
 * @param {Object} [optionen]
 * @param {string[]} [optionen.andereLoesungen] Andere Wörter derselben Runde (Verwechslungen erkennen)
 * @returns {{urteil: Urteil, abstand: number, treffer: string|null}}
 */
export function antwortPruefen(eingabe, loesung, optionen = {}) {
  const roh = String(eingabe || '').trim();
  if (!roh) return { urteil: 'leer', abstand: Infinity, treffer: null };

  const eingegeben = normalisieren(roh);
  const varianten = loesungsVarianten(loesung).map((v) => ({ text: v, norm: normalisieren(v) }));

  let bester = { abstand: Infinity, treffer: null };
  for (const variante of varianten) {
    if (!variante.norm) continue;
    const d = abstand(eingegeben, variante.norm);
    if (d < bester.abstand) bester = { abstand: d, treffer: variante.text, laenge: variante.norm.length };
  }

  if (bester.abstand === 0) return { urteil: 'richtig', abstand: 0, treffer: bester.treffer };

  // Eine andere Vokabel der Runde? Dann ist es eine Verwechslung, kein Tippfehler.
  const andere = (optionen.andereLoesungen || []).map((w) => normalisieren(w));
  if (andere.some((w) => w && w === eingegeben)) {
    return { urteil: 'verwechselt', abstand: bester.abstand, treffer: bester.treffer };
  }

  // Als Tippfehler gilt nur, was nah genug dran ist UND mit demselben
  // Buchstaben beginnt – sonst würde aus "Maus" ein akzeptiertes "Haus".
  const laenge = bester.laenge || 0;
  const erlaubt = laenge >= 9 ? 2 : laenge >= 5 ? 1 : 0;
  const gleicherAnfang = bester.treffer && eingegeben[0] === normalisieren(bester.treffer)[0];
  if (bester.abstand <= erlaubt && gleicherAnfang) {
    return { urteil: 'tippfehler', abstand: bester.abstand, treffer: bester.treffer };
  }

  return { urteil: 'falsch', abstand: bester.abstand, treffer: bester.treffer };
}

/** Stimmt die Abschrift beim Korrigieren exakt? (Umlaute/Artikel bleiben dabei relevant.) */
export function abschriftStimmt(eingabe, loesung) {
  return normalisieren(eingabe, { artikelEntfernen: false }) === normalisieren(loesung, { artikelEntfernen: false });
}
