/**
 * Bildkatalog.
 *
 * Für jede Vokabel soll ein eindeutiges Bild als Gedächtnisanker bereitstehen.
 * Der Katalog liefert Symbole mit Suchbegriffen (deutsch, englisch, spanisch),
 * damit beim Import automatisch ein passendes Bild vorgeschlagen wird und die
 * Auswahl im Editor durchsuchbar ist.
 */

/** @type {Array<[string, string[]]>} Symbol + Suchbegriffe */
const KATALOG = [
  ['🍎', ['apfel', 'apple', 'manzana', 'obst']],
  ['🍌', ['banane', 'banana', 'plátano']],
  ['🍓', ['erdbeere', 'strawberry', 'fresa']],
  ['🍊', ['orange', 'naranja', 'apfelsine']],
  ['🍇', ['traube', 'trauben', 'grapes', 'uva']],
  ['🍋', ['zitrone', 'lemon', 'limón']],
  ['🍉', ['melone', 'wassermelone', 'watermelon', 'sandía']],
  ['🍞', ['brot', 'bread', 'pan']],
  ['🧀', ['käse', 'kaese', 'cheese', 'queso']],
  ['🥚', ['ei', 'egg', 'huevo']],
  ['🥛', ['milch', 'milk', 'leche']],
  ['💧', ['wasser', 'water', 'agua', 'tropfen']],
  ['☕', ['kaffee', 'coffee', 'café']],
  ['🍵', ['tee', 'tea', 'té']],
  ['🥕', ['gemüse', 'gemuese', 'vegetable', 'karotte', 'möhre', 'carrot', 'zanahoria']],
  ['🥔', ['kartoffel', 'potato', 'patata']],
  ['🍅', ['tomate', 'tomato']],
  ['🍚', ['reis', 'rice', 'arroz']],
  ['🍝', ['nudeln', 'pasta', 'spaghetti']],
  ['🍲', ['suppe', 'soup', 'sopa', 'eintopf']],
  ['🧂', ['salz', 'salt', 'sal']],
  ['🍰', ['kuchen', 'cake', 'torta', 'pastel']],
  ['🍫', ['schokolade', 'chocolate']],
  ['🔪', ['messer', 'knife', 'cuchillo']],
  ['🥄', ['löffel', 'loeffel', 'spoon', 'cuchara']],
  ['🍴', ['gabel', 'fork', 'tenedor', 'besteck']],
  ['🍽️', ['teller', 'plate', 'plato', 'essen']],
  ['🥤', ['getränk', 'getraenk', 'drink', 'becher']],

  ['🏠', ['haus', 'house', 'casa', 'zuhause', 'home']],
  ['🏢', ['gebäude', 'gebaeude', 'building', 'edificio', 'büro']],
  ['🚪', ['tür', 'tuer', 'door', 'puerta']],
  ['🪟', ['fenster', 'window', 'ventana']],
  ['🪑', ['stuhl', 'chair', 'silla', 'sessel']],
  ['🛏️', ['bett', 'bed', 'cama']],
  ['🛋️', ['sofa', 'couch']],
  ['🚿', ['dusche', 'shower', 'ducha']],
  ['🛁', ['badewanne', 'bad', 'bath', 'bañera']],
  ['🔑', ['schlüssel', 'schluessel', 'key', 'llave']],
  ['💡', ['lampe', 'licht', 'light', 'lamp', 'luz', 'glühbirne']],
  ['🕰️', ['uhr', 'clock', 'reloj', 'zeit']],
  ['🪞', ['spiegel', 'mirror', 'espejo']],
  ['🧹', ['besen', 'broom', 'putzen']],
  ['🪣', ['eimer', 'bucket', 'cubo']],
  ['🧺', ['korb', 'basket', 'wäsche']],
  ['🪜', ['leiter', 'ladder', 'escalera']],
  ['🔨', ['hammer', 'martillo', 'werkzeug']],
  ['🪚', ['säge', 'saege', 'saw', 'sierra']],
  ['🧱', ['ziegel', 'stein', 'brick', 'mauer', 'wand', 'wall', 'pared']],

  ['🐕', ['hund', 'dog', 'perro']],
  ['🐈', ['katze', 'cat', 'gato']],
  ['🐟', ['fisch', 'fish', 'pez', 'pescado']],
  ['🐦', ['vogel', 'bird', 'pájaro']],
  ['🐴', ['pferd', 'horse', 'caballo']],
  ['🐄', ['kuh', 'cow', 'vaca']],
  ['🐖', ['schwein', 'pig', 'cerdo']],
  ['🐑', ['schaf', 'sheep', 'oveja']],
  ['🐝', ['biene', 'bee', 'abeja']],
  ['🦋', ['schmetterling', 'butterfly', 'mariposa']],
  ['🐭', ['maus', 'mouse', 'ratón']],
  ['🐻', ['bär', 'baer', 'bear', 'oso']],
  ['🦊', ['fuchs', 'fox', 'zorro']],
  ['🐘', ['elefant', 'elephant', 'elefante']],

  ['🌳', ['baum', 'tree', 'árbol', 'arbol']],
  ['🌲', ['tanne', 'wald', 'forest', 'bosque']],
  ['🌸', ['blume', 'flower', 'flor', 'blüte']],
  ['🌱', ['pflanze', 'plant', 'planta']],
  ['🍃', ['blatt', 'leaf', 'hoja']],
  ['⛰️', ['berg', 'mountain', 'montaña', 'montana']],
  ['🏖️', ['strand', 'beach', 'playa']],
  ['🌊', ['meer', 'sea', 'mar', 'welle', 'ozean']],
  ['🏞️', ['fluss', 'river', 'río', 'rio', 'see', 'lake']],
  ['☀️', ['sonne', 'sun', 'sol']],
  ['🌙', ['mond', 'moon', 'luna']],
  ['⭐', ['stern', 'star', 'estrella']],
  ['☁️', ['wolke', 'cloud', 'nube']],
  ['🌧️', ['regen', 'rain', 'lluvia']],
  ['❄️', ['schnee', 'snow', 'nieve', 'winter']],
  ['🔥', ['feuer', 'fire', 'fuego']],
  ['🌍', ['erde', 'welt', 'world', 'earth', 'mundo']],

  ['🚗', ['auto', 'car', 'coche', 'wagen']],
  ['🚲', ['fahrrad', 'bicycle', 'bike', 'bicicleta', 'rad']],
  ['🚌', ['bus', 'autobús']],
  ['🚆', ['zug', 'train', 'tren', 'bahn']],
  ['✈️', ['flugzeug', 'plane', 'airplane', 'avión', 'avion']],
  ['🚢', ['schiff', 'ship', 'barco', 'boot', 'boat']],
  ['🛣️', ['straße', 'strasse', 'street', 'road', 'calle']],
  ['🌉', ['brücke', 'bruecke', 'bridge', 'puente']],

  ['👤', ['person', 'mensch', 'persona']],
  ['👨', ['mann', 'man', 'hombre']],
  ['👩', ['frau', 'woman', 'mujer']],
  ['👶', ['baby', 'bebé', 'kind klein']],
  ['🧒', ['kind', 'child', 'niño', 'nino']],
  ['👪', ['familie', 'family', 'familia']],
  ['🤝', ['freund', 'friend', 'amigo', 'hand geben']],
  ['✋', ['hand', 'mano']],
  ['👁️', ['auge', 'eye', 'ojo']],
  ['👂', ['ohr', 'ear', 'oreja']],
  ['👃', ['nase', 'nose', 'nariz']],
  ['👄', ['mund', 'mouth', 'boca']],
  ['🦶', ['fuß', 'fuss', 'foot', 'pie']],
  ['🦵', ['bein', 'leg', 'pierna']],
  ['❤️', ['herz', 'heart', 'corazón', 'liebe', 'love', 'amor']],
  ['🧠', ['gehirn', 'brain', 'kopf denken']],

  ['👕', ['hemd', 'shirt', 'camisa', 'tshirt']],
  ['👖', ['hose', 'trousers', 'pants', 'pantalón']],
  ['👗', ['kleid', 'dress', 'vestido']],
  ['🧥', ['jacke', 'mantel', 'jacket', 'coat', 'abrigo']],
  ['👞', ['schuh', 'shoe', 'zapato']],
  ['🧢', ['mütze', 'muetze', 'cap', 'hut', 'hat', 'gorra']],
  ['🧤', ['handschuh', 'glove', 'guante']],
  ['🧣', ['schal', 'scarf', 'bufanda']],

  ['📕', ['buch', 'book', 'libro']],
  ['📝', ['schreiben', 'write', 'escribir', 'notiz', 'aufgabe']],
  ['✏️', ['stift', 'bleistift', 'pencil', 'lápiz', 'lapiz']],
  ['📚', ['bibliothek', 'library', 'bücher', 'schule lernen']],
  ['🏫', ['schule', 'school', 'escuela']],
  ['👩‍🏫', ['lehrer', 'lehrerin', 'teacher', 'profesor']],
  ['🎒', ['rucksack', 'backpack', 'mochila', 'schultasche']],
  ['📰', ['zeitung', 'newspaper', 'periódico']],
  ['✉️', ['brief', 'letter', 'carta', 'post']],
  ['📱', ['handy', 'telefon', 'phone', 'teléfono', 'móvil']],
  ['💻', ['computer', 'laptop', 'ordenador', 'rechner']],
  ['📷', ['kamera', 'camera', 'cámara', 'foto']],
  ['🎵', ['musik', 'music', 'música', 'lied', 'song']],
  ['⚽', ['fußball', 'fussball', 'football', 'soccer', 'ball', 'pelota']],
  ['🎨', ['malen', 'kunst', 'art', 'paint', 'pintar', 'farbe']],
  ['🎬', ['film', 'movie', 'película', 'kino']],

  ['💰', ['geld', 'money', 'dinero']],
  ['🛒', ['einkaufen', 'shopping', 'compra', 'wagen supermarkt']],
  ['🏪', ['laden', 'geschäft', 'shop', 'store', 'tienda']],
  ['🏥', ['krankenhaus', 'hospital']],
  ['💊', ['medikament', 'medizin', 'medicine', 'tablette']],
  ['🩺', ['arzt', 'ärztin', 'doctor', 'médico']],
  ['🕐', ['stunde', 'hour', 'hora', 'zeit']],
  ['📅', ['tag', 'datum', 'day', 'día', 'kalender', 'woche', 'week']],
  ['🎂', ['geburtstag', 'birthday', 'cumpleaños']],
  ['🎁', ['geschenk', 'present', 'gift', 'regalo']],

  ['😀', ['glücklich', 'gluecklich', 'happy', 'feliz', 'freude', 'lachen']],
  ['😢', ['traurig', 'sad', 'triste', 'weinen']],
  ['😠', ['wütend', 'wuetend', 'angry', 'enfadado', 'ärger']],
  ['😴', ['schlafen', 'sleep', 'dormir', 'müde', 'tired']],
  ['🏃', ['laufen', 'rennen', 'run', 'correr']],
  ['🚶', ['gehen', 'walk', 'caminar', 'andar']],
  ['🗣️', ['sprechen', 'reden', 'speak', 'talk', 'hablar']],
  ['👂🗨️', ['hören', 'hoeren', 'listen', 'escuchar']],
  ['🤔', ['denken', 'think', 'pensar', 'überlegen']],
  ['👍', ['gut', 'good', 'bien', 'ja', 'richtig']],
  ['👎', ['schlecht', 'bad', 'mal', 'falsch']],
  ['❓', ['frage', 'question', 'pregunta', 'was']]
];

const INDEX = new Map();
for (const [emoji, begriffe] of KATALOG) {
  for (const begriff of begriffe) {
    if (!INDEX.has(begriff)) INDEX.set(begriff, emoji);
  }
}

function vereinfachen(text) {
  return String(text || '').toLowerCase()
    .replace(/^(der|die|das|the|a|an|el|la|los|las|un|una|to)\s+/, '')
    .replace(/[^a-zäöüßñáéíóú\s]/g, '')
    .trim();
}

/**
 * Sucht ein passendes Symbol zu Wort und Übersetzung.
 * @returns {import('./vocab.js').Bild|null}
 */
export function bildVorschlag(wort, bedeutung) {
  for (const kandidat of [bedeutung, wort]) {
    const begriff = vereinfachen(kandidat);
    if (!begriff) continue;
    if (INDEX.has(begriff)) return { art: 'emoji', wert: INDEX.get(begriff), beschreibung: kandidat };
    // Einzelne Wortbestandteile prüfen ("roter Apfel" → Apfel)
    for (const teil of begriff.split(/\s+/)) {
      if (teil.length > 2 && INDEX.has(teil)) {
        return { art: 'emoji', wert: INDEX.get(teil), beschreibung: kandidat };
      }
    }
  }
  return null;
}

/**
 * Symbolauswahl für den Editor.
 * @param {string} suche
 * @returns {string[]}
 */
export function bilderSuchen(suche) {
  const begriff = vereinfachen(suche);
  if (!begriff) return KATALOG.map(([emoji]) => emoji);
  return KATALOG
    .filter(([, begriffe]) => begriffe.some((b) => b.includes(begriff) || begriff.includes(b)))
    .map(([emoji]) => emoji);
}

/** Alle Symbole des Katalogs. */
export function alleBilder() {
  return KATALOG.map(([emoji]) => emoji);
}
