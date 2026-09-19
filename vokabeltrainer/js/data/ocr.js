/**
 * Vokabeln aus einem Foto lesen.
 *
 * Die veröffentlichte Seite darf Claude fragen: Claude sieht das Foto selbst,
 * versteht zweispaltige Listen, liest Handschrift und erkennt, welche Spalte
 * die Fremdsprache ist. Ergebnis ist eine Liste von Vokabelentwürfen, die der
 * Nutzer vor dem Übernehmen prüfen und korrigieren kann – automatisch
 * übernommen wird nichts.
 *
 * Steht Claude nicht zur Verfügung (z.B. in einer lokalen Kopie), meldet
 * `erkennungSuchen()` das mit `null`; die Oberfläche verweist dann auf den
 * Import per Textliste.
 */

import { bildVorschlag } from './bilder.js';

/** So viele Fotos dürfen für eine Liste zusammen ausgewertet werden. */
export const MAX_FOTOS = 12;

/**
 * Bilder pro Anfrage. Mehrere Seiten werden nacheinander gelesen: das hält
 * die Antwort je Anfrage kurz genug, um nicht abgeschnitten zu werden, und
 * der Fortschritt bleibt sichtbar.
 */
const BILDER_PRO_ANFRAGE = 3;

/**
 * Bildformate, wenn die Ansicht keine Liste liefert. Bewusst ohne "image/*":
 * iPhones wandeln HEIC-Fotos nur dann in JPEG um, wenn das Auswahlfeld
 * ausdrücklich nach JPEG fragt.
 */
const STANDARD_TYPEN = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * @typedef {Object} Erkennung
 * @property {number} maxBilder   Fotos insgesamt
 * @property {string[]} dateitypen
 * @property {(dateien: File[], optionen: Object) => Promise<Object[]>} lesen
 */

/**
 * Sucht die Bilderkennung.
 * @returns {Promise<Erkennung|null>} null, wenn hier keine Erkennung möglich ist
 */
export async function erkennungSuchen() {
  try {
    if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null;
    const sample = await window.claude.use('sample');
    if (!sample) return null;
    const grenzen = await sample.limits().catch(() => null);
    // Sagt die Ansicht ausdrücklich, dass sie keine Bilder schicken kann, ist hier Schluss.
    if (grenzen && !grenzen.images) return null;

    // Lässt sich das nicht ermitteln, wird es vorsichtig versucht: ein Bild pro
    // Anfrage. Ein echtes Hindernis meldet dann die Anfrage selbst – mit einer
    // Begründung, die der Nutzer lesen kann.
    const bilder = (grenzen && grenzen.images) || null;
    const proAnfrage = Math.max(1, Math.min(BILDER_PRO_ANFRAGE, (bilder && bilder.maxCount) || 1));
    return {
      maxBilder: MAX_FOTOS,
      proAnfrage,
      dateitypen: (bilder && bilder.mediaTypes) || STANDARD_TYPEN,
      lesen: (dateien, optionen) => lesen(sample, dateien, { ...optionen, proAnfrage })
    };
  } catch (fehler) {
    console.warn('Bilderkennung nicht verfügbar.', fehler);
    return null;
  }
}

/**
 * Die Anweisung an Claude.
 *
 * Artikel sind hier besonders wichtig: sie gehören zur Vokabel und dürfen
 * beim Einlesen nicht verloren gehen – weder auf der fremdsprachlichen noch
 * auf der deutschen Seite.
 */
export function leseAnweisung(sprache) {
  return [
    `Auf den Bildern ist eine Vokabelliste. Fremdsprache: ${sprache}. Zielsprache: Deutsch.`,
    '',
    'Lies alle Vokabelpaare heraus, auch handschriftliche. Die Fremdsprache kann links oder',
    'rechts stehen – ordne nach Sprache zu, nicht nach Position.',
    '',
    'Für jedes Paar:',
    `- "wort": das Wort auf ${sprache}, genau wie geschrieben, aber ohne Artikel`,
    '- "artikel": der Artikel des fremdsprachlichen Wortes, wenn die Liste ihn nennt',
    '  (zum Beispiel the, a, el, la, le, la, il, de, het, der, die, das).',
    '  Artikel niemals weglassen – sie gehören zur Vokabel. Wenn kein Artikel dasteht: ""',
    '- "bedeutung": die deutsche Übersetzung. Steht dort ein Artikel (der/die/das),',
    '  übernimm ihn mit in die Übersetzung.',
    '- "plural": Pluralform, falls angegeben, sonst ""',
    '- "beispiel": Beispielsatz, falls angegeben, sonst ""',
    '',
    'Regeln:',
    '- Überschriften, Kapitel- und Seitenzahlen sowie Nummerierungen am Zeilenanfang weglassen.',
    '- Mehrere Übersetzungen eines Wortes mit " / " trennen.',
    '- Unleserliche Zeilen weglassen statt zu raten.',
    '- Buchstaben mit Akzenten und Umlauten genau übernehmen.',
    '- Die Reihenfolge der Liste beibehalten.',
    '',
    'Antworte nur mit einem JSON-Array, zum Beispiel:',
    '[{"wort":"casa","artikel":"la","bedeutung":"das Haus","plural":"casas","beispiel":""}]'
  ].join('\n');
}

/**
 * Liest alle Fotos – bei Bedarf in mehreren Anfragen – und fügt die
 * Ergebnisse in der Reihenfolge der Bilder zusammen.
 */
async function lesen(sample, dateien, { sprache, onMeldung, signal, proAnfrage = 1 } = {}) {
  const stapel = stapelBilden([...dateien], proAnfrage);
  const gesammelt = [];

  for (const [nummer, teil] of stapel.entries()) {
    const erstes = stapel.slice(0, nummer).reduce((summe, s) => summe + s.length, 0) + 1;
    const letztes = erstes + teil.length - 1;
    if (onMeldung) {
      onMeldung({
        text: dateien.length > 1
          ? `Claude liest Bild ${erstes === letztes ? erstes : erstes + '–' + letztes} von ${dateien.length} …`
          : 'Claude liest das Bild …',
        anteil: (nummer + 0.15) / stapel.length
      });
    }

    let antwort;
    try {
      antwort = await sample.json(leseAnweisung(sprache), {
        images: teil,
        modelTier: 'default',
        signal,
        onText: () => {
          if (onMeldung) onMeldung({ text: 'Vokabeln werden zusammengestellt …', anteil: (nummer + 0.75) / stapel.length });
        }
      });
    } catch (fehler) {
      // Schon gelesene Seiten nicht verlieren – die Oberfläche zeigt sie mit Hinweis.
      if (gesammelt.length && fehler && typeof fehler === 'object') fehler.teilErgebnis = doppelteEntfernen(gesammelt);
      throw fehler;
    }

    if (!Array.isArray(antwort)) throw new Error('Unerwartete Antwort der Bilderkennung.');
    gesammelt.push(...antwort.map(entwurfAufbereiten).filter(Boolean));
  }

  return doppelteEntfernen(gesammelt);
}

/** Teilt die Bilder in Gruppen für je eine Anfrage. */
export function stapelBilden(liste, groesse) {
  const schrittweite = Math.max(1, groesse);
  const stapel = [];
  for (let i = 0; i < liste.length; i += schrittweite) stapel.push(liste.slice(i, i + schrittweite));
  return stapel;
}

/**
 * Entfernt Wiederholungen – bei überlappenden Fotos steht dieselbe Vokabel
 * sonst zweimal in der Liste. Ergänzende Angaben werden dabei übernommen.
 */
export function doppelteEntfernen(entwuerfe) {
  const gesehen = new Map();
  for (const entwurf of entwuerfe) {
    const schluessel = `${entwurf.wort.toLowerCase()}|${entwurf.bedeutung.toLowerCase()}`;
    const vorhanden = gesehen.get(schluessel);
    if (!vorhanden) {
      gesehen.set(schluessel, entwurf);
      continue;
    }
    for (const feld of ['artikel', 'plural', 'beispiel']) {
      if (!vorhanden[feld] && entwurf[feld]) vorhanden[feld] = entwurf[feld];
    }
    if (!vorhanden.bild && entwurf.bild) vorhanden.bild = entwurf.bild;
  }
  return [...gesehen.values()];
}

/** Meldungstext zu einem Fehlercode der Claude-Anbindung. */
export function claudeFehlerText(fehler) {
  const texte = {
    not_granted: 'Die Seite darf Claude nicht fragen. Du kannst die Vokabeln stattdessen als Liste einfügen.',
    sampling_disabled: 'Claude steht für dieses Konto nicht zur Verfügung.',
    images_unavailable: 'In dieser Ansicht können keine Bilder an Claude geschickt werden.',
    image_rejected: 'Mit diesem Bild kommt die Erkennung nicht zurecht. Versuch ein anderes Foto.',
    rate_limited: 'Gerade zu viele Anfragen. Bitte in ein paar Minuten noch einmal versuchen.',
    session_expired: 'Bitte neu anmelden und es noch einmal versuchen.',
    invalid_json: 'Die Antwort war unvollständig. Versuch es mit einem kleineren Ausschnitt.',
    empty_completion: 'Auf dem Bild war keine Vokabelliste zu erkennen.',
    refused: 'Dieses Bild wurde nicht ausgewertet. Bitte ein anderes Foto verwenden.',
    cancelled: 'Abgebrochen.',
    prompt_too_large: 'Das Bild enthält zu viel Text. Fotografiere die Liste in zwei Teilen.'
  };
  const code = fehler && fehler.code;
  return texte[code] || 'Die Texterkennung hat nicht geklappt. Versuch es noch einmal oder füge die Liste als Text ein.';
}

/* --- Aufbereitung -------------------------------------------------------- */

/** Artikel, die vom Wort abgetrennt werden, wenn sie mit im Wortfeld stehen. */
const ARTIKEL = /^(der|die|das|den|dem|ein|eine|the|a|an|el|la|los|las|un|una|le|les|une|il|lo|gli|de|het|een)\s+(.+)$/i;

/**
 * Zeilen wie "Unit 3", "Lektion 5" oder "Seite 12" sind Überschriften und
 * keine Vokabeln. Erkannt wird nur die Form mit Nummer – damit echte
 * Vokabeln wie "part – Teil" nicht verloren gehen.
 */
const UEBERSCHRIFT = /^(unit|lektion|lesson|kapitel|chapter|seite|page|übung|uebung|exercise|teil|part|modul|module|abschnitt|nr\.?|no\.?)\s*\d+/i;

/** Säubert einen erkannten Eintrag, trennt den Artikel ab und schlägt ein Bild vor. */
export function entwurfAufbereiten(roh) {
  if (!roh) return null;
  const saeubern = (wert) => String(wert || '')
    .replace(/^[\s0-9.)\]•·–—-]+/, '')     // Nummerierung am Zeilenanfang
    .replace(/[\s.,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  let wort = saeubern(roh.wort);
  let artikel = saeubern(roh.artikel);
  const bedeutung = saeubern(roh.bedeutung);

  // Artikel, der im Wortfeld gelandet ist, sauber in das eigene Feld holen.
  const artikelTreffer = wort.match(ARTIKEL);
  if (!artikel && artikelTreffer) {
    artikel = artikelTreffer[1];
    wort = artikelTreffer[2];
  }

  if (!wort || !bedeutung) return null;
  if (wort.length > 60 || bedeutung.length > 80) return null;
  if (UEBERSCHRIFT.test(wort) || UEBERSCHRIFT.test(bedeutung)) return null;
  if (!/[a-zA-ZÀ-ÿ]/.test(wort) || !/[a-zA-ZÀ-ÿ]/.test(bedeutung)) return null;
  if (wort.split(' ').length > 6) return null;

  return {
    wort,
    bedeutung,
    artikel,
    plural: saeubern(roh.plural),
    beispiel: String(roh.beispiel || '').trim(),
    kategorie: '',
    bild: bildVorschlag(wort, bedeutung),
    ton: { art: 'stimme', wert: '' }
  };
}
