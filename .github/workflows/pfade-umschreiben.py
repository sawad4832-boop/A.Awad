#!/usr/bin/env python3
"""
Bereitet die Website für die Auslieferung in einem Unterverzeichnis vor
(GitHub Pages liefert Projektseiten unter /<Repository-Name>/ aus).

Dabei werden absolute Pfade umgeschrieben – auch innerhalb von srcset-Listen,
die mehrere durch Komma getrennte Adressen enthalten. Zusätzlich werden alle
Seiten für Suchmaschinen gesperrt, damit die Vorschau der eigentlichen Domain
keine Konkurrenz macht.

Aufruf:  python3 pfade-umschreiben.py <Verzeichnis> <Präfix>
"""
import json
import pathlib
import re
import sys

target = pathlib.Path(sys.argv[1])
prefix = sys.argv[2].rstrip('/')          # z. B. "/A.Awad"


def fix_srcset(match):
    attr, value = match.group(1), match.group(2)
    parts = []
    for part in value.split(','):
        part = part.strip()
        if part.startswith('/') and not part.startswith(prefix + '/'):
            part = prefix + part
        parts.append(part)
    return '%s="%s"' % (attr, ', '.join(parts))


changed = 0
for file in sorted(target.rglob('*.html')):
    s = original = file.read_text(encoding='utf-8')

    # srcset zuerst: enthält mehrere Adressen pro Attribut
    s = re.sub(r'\b(srcset)="([^"]+)"', fix_srcset, s)

    # einfache Attribute mit genau einer Adresse
    s = re.sub(r'\b(href|src|content)="/(?!/)', r'\1="%s/' % prefix, s)

    # Vorschau nicht indexieren lassen
    s = s.replace('content="index, follow, max-image-preview:large"',
                  'content="noindex, nofollow"')

    if s != original:
        file.write_text(s, encoding='utf-8')
        changed += 1

print('HTML-Dateien angepasst: %d' % changed)

# Web-App-Manifest enthält ebenfalls absolute Pfade
manifest = target / 'site.webmanifest'
if manifest.exists():
    data = json.loads(manifest.read_text(encoding='utf-8'))
    data['start_url'] = prefix + '/'
    for icon in data.get('icons', []):
        if icon.get('src', '').startswith('/') and not icon['src'].startswith(prefix + '/'):
            icon['src'] = prefix + icon['src']
    manifest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print('site.webmanifest angepasst')

# ---------------------------------------------------------------------------
# Kontrolle: es darf keine absolute Adresse ohne Präfix übrig bleiben
# ---------------------------------------------------------------------------
problems = []
for file in sorted(target.rglob('*.html')):
    s = file.read_text(encoding='utf-8')
    for attr, value in re.findall(r'\b(href|src|srcset|content)="([^"]*)"', s):
        for part in (value.split(',') if attr == 'srcset' else [value]):
            part = part.strip().split(' ')[0]
            if part.startswith('/') and not part.startswith(prefix + '/'):
                problems.append('%s: %s="%s"' % (file.name, attr, part))
    if 'noindex' not in s.lower():
        problems.append('%s: fehlendes noindex' % file.name)

if problems:
    print('\nFEHLER – nicht umgeschriebene Pfade:')
    for p in sorted(set(problems)):
        print('  ' + p)
    sys.exit(1)

print('Kontrolle bestanden: keine absoluten Pfade ohne Präfix, alle Seiten auf noindex.')
