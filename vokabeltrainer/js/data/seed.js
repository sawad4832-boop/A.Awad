/**
 * Beispielvokabeln, damit die App ohne eigene Eingaben sofort testbar ist.
 *
 * Die Bilder sind Emoji-Symbole: sie stellen die Bedeutung eindeutig dar,
 * funktionieren offline und brauchen keine Bildrechte. Eigene Fotos lassen
 * sich in jeder Vokabel ergänzen.
 */

/** @returns {Array<Partial<import('./vocab.js').Lernset>>} */
export function beispielSets() {
  return [
    {
      id: 'set_beispiel_alltag',
      name: 'Englisch – Alltag',
      sprache: 'Englisch',
      sprachcode: 'en-US',
      vokabeln: [
        w('apple', 'Apfel', '🍎', 'Obst', { plural: 'apples', beispiel: 'She eats an apple every morning.' }),
        w('house', 'Haus', '🏠', 'Wohnen', { plural: 'houses', beispiel: 'Their house has a red roof.' }),
        w('tree', 'Baum', '🌳', 'Natur', { plural: 'trees', beispiel: 'A tall tree stands in the garden.' }),
        w('window', 'Fenster', '🪟', 'Wohnen', { plural: 'windows', beispiel: 'Please open the window.' }),
        w('chair', 'Stuhl', '🪑', 'Wohnen', { plural: 'chairs', beispiel: 'He sits on a wooden chair.' }),
        w('dog', 'Hund', '🐕', 'Tiere', { plural: 'dogs', beispiel: 'The dog runs across the field.' }),
        w('key', 'Schlüssel', '🔑', 'Alltag', { plural: 'keys', beispiel: 'I lost my key again.' }),
        w('book', 'Buch', '📕', 'Alltag', { plural: 'books', beispiel: 'This book is really good.' }),
        w('clock', 'Uhr', '🕰️', 'Alltag', { plural: 'clocks', beispiel: 'The clock on the wall is slow.' }),
        w('bicycle', 'Fahrrad', '🚲', 'Verkehr', { plural: 'bicycles', beispiel: 'She rides her bicycle to work.', schwierigkeit: 3 }),
        w('umbrella', 'Regenschirm', '☂️', 'Alltag', { plural: 'umbrellas', beispiel: 'Take an umbrella, it is raining.', schwierigkeit: 3 }),
        w('mountain', 'Berg', '⛰️', 'Natur', { plural: 'mountains', beispiel: 'We climbed the mountain in summer.', schwierigkeit: 3 })
      ]
    },
    {
      id: 'set_beispiel_essen',
      name: 'Englisch – Essen & Trinken',
      sprache: 'Englisch',
      sprachcode: 'en-US',
      vokabeln: [
        w('bread', 'Brot', '🍞', 'Essen', { beispiel: 'We buy fresh bread every day.' }),
        w('cheese', 'Käse', '🧀', 'Essen', { beispiel: 'This cheese comes from France.' }),
        w('milk', 'Milch', '🥛', 'Trinken', { beispiel: 'There is no milk left.' }),
        w('water', 'Wasser', '💧', 'Trinken', { beispiel: 'Could I have a glass of water?' }),
        w('egg', 'Ei', '🥚', 'Essen', { plural: 'eggs', beispiel: 'He cooked two eggs.' }),
        w('strawberry', 'Erdbeere', '🍓', 'Obst', { plural: 'strawberries', beispiel: 'The strawberry is very sweet.', schwierigkeit: 3 }),
        w('knife', 'Messer', '🔪', 'Küche', { plural: 'knives', beispiel: 'The knife is very sharp.', schwierigkeit: 3 }),
        w('spoon', 'Löffel', '🥄', 'Küche', { plural: 'spoons', beispiel: 'Stir it with a spoon.' }),
        w('coffee', 'Kaffee', '☕', 'Trinken', { beispiel: 'I drink coffee without sugar.' }),
        w('vegetable', 'Gemüse', '🥕', 'Essen', { plural: 'vegetables', beispiel: 'Eat more vegetables.', schwierigkeit: 3 })
      ]
    },
    {
      id: 'set_beispiel_spanisch',
      name: 'Spanisch – Erste Wörter',
      sprache: 'Spanisch',
      sprachcode: 'es-ES',
      vokabeln: [
        w('casa', 'Haus', '🏠', 'Wohnen', { artikel: 'la', plural: 'casas', beispiel: 'La casa es muy grande.' }),
        w('perro', 'Hund', '🐕', 'Tiere', { artikel: 'el', plural: 'perros', beispiel: 'El perro duerme.' }),
        w('manzana', 'Apfel', '🍎', 'Obst', { artikel: 'la', plural: 'manzanas', beispiel: 'Quiero una manzana.' }),
        w('libro', 'Buch', '📕', 'Alltag', { artikel: 'el', plural: 'libros', beispiel: 'El libro está en la mesa.' }),
        w('agua', 'Wasser', '💧', 'Trinken', { artikel: 'el', beispiel: 'Un vaso de agua, por favor.' }),
        w('sol', 'Sonne', '☀️', 'Natur', { artikel: 'el', beispiel: 'Hoy hace sol.' }),
        w('ventana', 'Fenster', '🪟', 'Wohnen', { artikel: 'la', plural: 'ventanas', beispiel: 'Abre la ventana.', schwierigkeit: 3 }),
        w('llave', 'Schlüssel', '🔑', 'Alltag', { artikel: 'la', plural: 'llaves', beispiel: 'No encuentro la llave.', schwierigkeit: 3 }),
        w('silla', 'Stuhl', '🪑', 'Wohnen', { artikel: 'la', plural: 'sillas', beispiel: 'La silla es de madera.' }),
        w('pan', 'Brot', '🍞', 'Essen', { artikel: 'el', beispiel: 'Compro pan fresco.' })
      ]
    }
  ];
}

/** Kurzschreibweise für eine Beispielvokabel. */
function w(wort, bedeutung, emoji, kategorie, extra = {}) {
  return {
    id: 'v_' + wort.replace(/\W/g, ''),
    wort,
    bedeutung,
    kategorie,
    bild: { art: 'emoji', wert: emoji, beschreibung: bedeutung },
    ton: { art: 'stimme', wert: '' },
    schwierigkeit: 2,
    ...extra
  };
}
