/** Unterstützte Fremdsprachen: Anzeigename und Code für Sprachausgabe und Texterkennung. */
export const SPRACHEN = [
  ['Englisch', 'en-US'], ['Spanisch', 'es-ES'], ['Französisch', 'fr-FR'], ['Italienisch', 'it-IT'],
  ['Niederländisch', 'nl-NL'], ['Portugiesisch', 'pt-PT'], ['Schwedisch', 'sv-SE'], ['Polnisch', 'pl-PL'],
  ['Russisch', 'ru-RU'], ['Türkisch', 'tr-TR'], ['Arabisch', 'ar-SA'], ['Deutsch', 'de-DE'], ['Latein', 'la']
];

/** Auswahlfeld für die Sprache. */
export function sprachOptionen(aktuelleSprache) {
  return SPRACHEN.map(([name, code]) => ({ name, code, gewaehlt: name === aktuelleSprache }));
}
