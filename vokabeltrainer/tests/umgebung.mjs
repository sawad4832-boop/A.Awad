/**
 * Minimalumgebung für die Tests.
 *
 * Die Lernlogik selbst kennt keinen Browser, greift aber über den Speicher
 * auf localStorage zu. Für die Tests genügen diese beiden Attrappen – sie
 * müssen gesetzt sein, bevor die App-Module geladen werden.
 */
globalThis.window = globalThis.window || {};
globalThis.localStorage = globalThis.localStorage || {
  daten: new Map(),
  getItem(schluessel) { return this.daten.has(schluessel) ? this.daten.get(schluessel) : null; },
  setItem(schluessel, wert) { this.daten.set(schluessel, String(wert)); },
  removeItem(schluessel) { this.daten.delete(schluessel); }
};
