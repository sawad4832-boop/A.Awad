/**
 * Kleine DOM-Hilfen. Ersetzt ein Framework: Elemente werden als Baum
 * beschrieben und direkt erzeugt – ohne Build-Schritt und ohne Abhängigkeiten.
 */

/**
 * Erzeugt ein Element.
 * @param {string} beschreibung z.B. "button.knopf.knopf--haupt"
 * @param {Object<string, any>|null} [attribute] Attribute, on*-Handler, dataset, style
 * @param {...(Node|string|number|null|undefined|Array)} kinder
 * @returns {HTMLElement}
 */
export function el(beschreibung, attribute, ...kinder) {
  const [tag, ...klassen] = beschreibung.split('.');
  const knoten = document.createElement(tag || 'div');
  if (klassen.length) knoten.className = klassen.join(' ');

  for (const [name, wert] of Object.entries(attribute || {})) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (name.startsWith('on') && typeof wert === 'function') {
      knoten.addEventListener(name.slice(2).toLowerCase(), wert);
    } else if (name === 'dataset') {
      Object.assign(knoten.dataset, wert);
    } else if (name === 'style' && typeof wert === 'object') {
      Object.assign(knoten.style, wert);
    } else if (name === 'html') {
      knoten.innerHTML = String(wert);
    } else if (wert === true) {
      knoten.setAttribute(name, '');
    } else {
      knoten.setAttribute(name, String(wert));
    }
  }

  anhaengen(knoten, kinder);
  return knoten;
}

/** @param {Node} ziel @param {any} kinder */
export function anhaengen(ziel, kinder) {
  for (const kind of kinder.flat(4)) {
    if (kind === null || kind === undefined || kind === false || kind === true) continue;
    ziel.appendChild(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
}

/** Leert einen Container und hängt neuen Inhalt ein. */
export function ersetzen(ziel, ...inhalt) {
  ziel.replaceChildren();
  anhaengen(ziel, inhalt);
  return ziel;
}

/** Meldung für Screenreader (und als Hinweis im Ablauf). */
export function ansagen(text) {
  const bereich = document.getElementById('statusmeldung');
  if (bereich) bereich.textContent = text;
}

/** Fortschrittsbalken. */
export function balken(anteil, gut = false) {
  const prozent = Math.max(0, Math.min(100, Math.round(anteil * 100)));
  return el('div.balken', {
    role: 'progressbar',
    'aria-valuenow': String(prozent),
    'aria-valuemin': '0',
    'aria-valuemax': '100'
  }, el('div.balken__fuellung' + (gut ? '.balken__fuellung--gut' : ''), { style: { width: prozent + '%' } }));
}

/** Modaler Dialog. onSchliessen wird bei Abbruch/Escape aufgerufen. */
export function dialog({ titel, inhalt, onSchliessen }) {
  const schicht = document.getElementById('dialogschicht');
  const schliessen = () => {
    schicht.replaceChildren();
    document.removeEventListener('keydown', beiTaste);
    if (onSchliessen) onSchliessen();
  };
  const beiTaste = (e) => { if (e.key === 'Escape') schliessen(); };
  document.addEventListener('keydown', beiTaste);

  const kasten = el('div.dialog__kasten', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titel },
    el('div.dialog__kopf', {},
      el('h2', {}, titel),
      el('button.knopf.knopf--leise', { type: 'button', 'aria-label': 'Schließen', onclick: schliessen }, '✕')
    ),
    inhalt
  );

  const huelle = el('div.dialog', {
    onclick: (e) => { if (e.target === huelle) schliessen(); }
  }, kasten);

  ersetzen(schicht, huelle);
  const ersterFokus = kasten.querySelector('input, textarea, button:not([aria-label="Schließen"])');
  if (ersterFokus) ersterFokus.focus();
  return { schliessen };
}
