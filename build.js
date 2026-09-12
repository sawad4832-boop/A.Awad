#!/usr/bin/env node
/**
 * A.AWAD BAUSERVICE — Seitengenerator
 *
 * Fügt die Inhalte aus src/pages/ in das gemeinsame Layout src/layout.html ein
 * und schreibt fertige, statische HTML-Dateien in das Projektverzeichnis.
 * Zusätzlich entstehen sitemap.xml, robots.txt und site.webmanifest.
 *
 *   Aufruf:  node build.js
 *
 * Die erzeugten HTML-Dateien sind vollständig eigenständig – zum Betrieb der
 * Website wird weder Node.js noch ein Build-Schritt benötigt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT   = __dirname;
const SRC    = path.join(ROOT, 'src');
const PAGES  = path.join(SRC, 'pages');
const SITE   = 'https://bauservice-awad.de';

const NAP = {
  legalName: 'Bauservice.Awad-Handwerk',
  name:      'A.Awad Bauservice',
  founder:   'Adnan Awad',
  street:    'Bernauer Str. 122',
  zip:       '16515',
  city:      'Oranienburg',
  region:    'Brandenburg',
  phone:     '+49 176 41949447',
  email:     'info@bauservice-awad.de',
  vat:       'DE455118425'
};

/* ---------------------------------------------------------------------------
   Strukturierte Daten (schema.org)
   --------------------------------------------------------------------------- */
const ld = {
  business: {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': SITE + '/#betrieb',
    name: NAP.name,
    legalName: NAP.legalName,
    description: 'Fachbetrieb für Fliesen und Trockenbau in Oranienburg. Fliesenarbeiten, ' +
                 'Trockenbau, Innenausbau, Estrich, Renovierung und Badsanierung mit über ' +
                 '20 Jahren Erfahrung.',
    url: SITE + '/',
    telephone: NAP.phone,
    email: NAP.email,
    image: SITE + '/assets/img/og-image.jpg',
    logo: SITE + '/assets/img/icon-512.png',
    vatID: NAP.vat,
    address: {
      '@type': 'PostalAddress',
      streetAddress: NAP.street,
      postalCode: NAP.zip,
      addressLocality: NAP.city,
      addressRegion: NAP.region,
      addressCountry: 'DE'
    },
    founder: { '@type': 'Person', name: NAP.founder },
    knowsLanguage: ['de', 'ar'],
    areaServed: [
      'Oranienburg', 'Leegebruch', 'Velten', 'Hennigsdorf', 'Birkenwerder',
      'Hohen Neuendorf', 'Mühlenbeck', 'Glienicke/Nordbahn', 'Zehdenick',
      'Gransee', 'Bernau bei Berlin', 'Landkreis Oberhavel', 'Berlin'
    ].map(n => ({ '@type': 'Place', name: n })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Leistungen',
      itemListElement: [
        ['Fliesen- & Natursteinarbeiten', 'Verlegung von Wand- und Bodenfliesen, Naturstein und Großformaten inklusive Abdichtung und Verfugung.'],
        ['Trockenbau', 'Trennwände, Vorsatzschalen, abgehängte Decken sowie Schall- und Brandschutzaufbauten.'],
        ['Innenausbau', 'Raumaufteilung, Dachgeschoss- und Kellerausbau, Einbauten und Nischenlösungen.'],
        ['Boden & Estrich', 'Estricharbeiten, Ausgleichsmassen, Fußbodenheizung und Bodenbeläge.'],
        ['Renovierung & Sanierung', 'Badsanierung, Modernisierung und Instandsetzung von Wohnungen und Häusern.'],
        ['Beratung & Planung', 'Aufmaß, Materialberatung, Kostenübersicht und Koordination der Gewerke.']
      ].map(([n, d]) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: n, description: d, serviceType: n }
      }))
    }
  },

  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE + '/#website',
    url: SITE + '/',
    name: NAP.name,
    inLanguage: 'de-DE',
    publisher: { '@id': SITE + '/#betrieb' }
  }
};

/* FAQ-Daten werden direkt aus dem Markup der Startseite gelesen,
   damit Anzeige und strukturierte Daten nicht auseinanderlaufen. */
function faqFromHtml(html) {
  const items = [];
  const re = /<summary>([\s\S]*?)<\/summary>\s*<div class="faq__a">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    items.push({
      '@type': 'Question',
      name: clean(m[1]),
      acceptedAnswer: { '@type': 'Answer', text: clean(m[2]) }
    });
  }
  if (!items.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
}

function clean(s) {
  return s.replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
          .replace(/&rsaquo;/g, '›').replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ').trim();
}

function breadcrumb(meta) {
  if (meta.path === '/') return null;
  const label = meta.title.split(/[|:]/)[0].trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Start', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: label, item: SITE + meta.path }
    ]
  };
}

function scriptLd(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';
}

/* ---------------------------------------------------------------------------
   Seiten erzeugen
   --------------------------------------------------------------------------- */
const layout = fs.readFileSync(path.join(SRC, 'layout.html'), 'utf8');
const files  = fs.readdirSync(PAGES).filter(f => f.endsWith('.html')).sort();
const built  = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(PAGES, file), 'utf8');
  const m = raw.match(/^<!--META\s*([\s\S]*?)\s*META-->\s*/);
  if (!m) { console.error('  ! Kein META-Block in ' + file); process.exit(1); }

  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length).trimEnd();

  const blocks = [];
  const want = String(meta.jsonld || '').split(',').map(s => s.trim()).filter(Boolean);
  if (want.includes('business') || want.includes('services')) {
    blocks.push(scriptLd(ld.business));
  }
  if (meta.path === '/') blocks.push(scriptLd(ld.website));
  if (want.includes('faq')) {
    const faq = faqFromHtml(body);
    if (faq) blocks.push(scriptLd(faq));
  }
  const bc = breadcrumb(meta);
  if (bc && meta.jsonld !== 'none') blocks.push(scriptLd(bc));

  let html = layout
    .replace(/\{\{TITLE\}\}/g,   esc(meta.title))
    .replace(/\{\{OGTITLE\}\}/g, esc(meta.ogtitle || meta.title))
    .replace(/\{\{DESC\}\}/g,    esc(meta.desc))
    .replace(/\{\{SITE\}\}/g,    SITE)
    .replace(/\{\{PATH\}\}/g,    meta.path === '/' ? '/' : meta.path)
    .replace(/\{\{JSONLD\}\}/g,  blocks.join('\n'))
    .replace(/\{\{A_HOME\}\}/g,  meta.active === 'home'       ? ' aria-current="page"' : '')
    .replace(/\{\{A_LEIST\}\}/g, meta.active === 'leistungen' ? ' aria-current="page"' : '')
    .replace(/\{\{A_PROJ\}\}/g,  meta.active === 'projekte'   ? ' aria-current="page"' : '')
    .replace(/\{\{A_KONT\}\}/g,  meta.active === 'kontakt'    ? ' aria-current="page"' : '')
    .replace(/\{\{BODY\}\}/g,    body);

  if (meta.noindex) {
    html = html.replace(
      '<meta name="robots" content="index, follow, max-image-preview:large">',
      '<meta name="robots" content="noindex, follow">');
  }

  const out = file === 'index.html' ? 'index.html' : file;
  fs.writeFileSync(path.join(ROOT, out), html);
  built.push({ file: out, meta });
  console.log('  ✓ ' + out.padEnd(20) + (html.length / 1024).toFixed(1) + ' kB');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* ---------------------------------------------------------------------------
   sitemap.xml / robots.txt / site.webmanifest
   --------------------------------------------------------------------------- */
const today = new Date().toISOString().slice(0, 10);
const prio  = { '/': '1.0', '/leistungen.html': '0.9', '/kontakt.html': '0.9', '/projekte.html': '0.8' };

const urls = built
  .filter(b => !b.meta.noindex)
  .map(b => '  <url>\n' +
            '    <loc>' + SITE + (b.meta.path === '/' ? '/' : b.meta.path) + '</loc>\n' +
            '    <lastmod>' + today + '</lastmod>\n' +
            '    <changefreq>monthly</changefreq>\n' +
            '    <priority>' + (prio[b.meta.path] || '0.5') + '</priority>\n' +
            '  </url>')
  .join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  'User-agent: *\n' +
  'Allow: /\n\n' +
  'Sitemap: ' + SITE + '/sitemap.xml\n');

fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
  name: 'A.Awad Bauservice',
  short_name: 'A.Awad',
  description: 'Fachbetrieb für Fliesen und Trockenbau in Oranienburg',
  start_url: '/',
  display: 'standalone',
  background_color: '#101215',
  theme_color: '#101215',
  lang: 'de-DE',
  icons: [
    { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
  ]
}, null, 2) + '\n');

console.log('  ✓ sitemap.xml, robots.txt, site.webmanifest');
console.log('\nFertig: ' + built.length + ' Seiten erzeugt.');
