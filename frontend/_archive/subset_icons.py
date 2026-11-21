"""Rebuild the Material Symbols subset used by ParkWatch.

    python _archive/subset_icons.py _archive/icons-used.txt

Why this exists: the npm font ships 6 670 glyphs / ~4 MB, but the app renders 49 icons.
Each icon also exists as its own glyph reachable through a private-use codepoint (the
cmap maps codepoint -> slug), so we keep only those and drop GSUB entirely. That means
<Icon /> must emit String.fromCodePoint() from src/iconCodepoints.json — writing the
slug as markup text no longer ligates. Add a new icon name to _archive/icons-used.txt,
regenerate iconCodepoints.json (see the one-liner at the bottom of this file), re-run
this script, then confirm with `node _archive/fonttest.cjs`.
"""
import json
import os
import sys
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter

SRC = 'frontend/node_modules/material-symbols/material-symbols-outlined.woff2'
OUT = 'frontend/src/assets/material-symbols-outlined.woff2'
CP_JSON = 'frontend/src/iconCodepoints.json'

names = [line.strip() for line in open(sys.argv[1]) if line.strip()]
font = TTFont(SRC)

# slug -> private-use codepoint
by_name = {}
for table in font['cmap'].tables:
    for cp, glyph in table.cmap.items():
        by_name.setdefault(glyph, cp)

missing = [n for n in names if n not in by_name]
keep = [n for n in names if n in by_name]
if missing:
    print('NOT IN FONT (fix the list, these are likely typos):', missing)

opts = Options()
opts.name_IDs = ['*']
opts.name_legacy = True
opts.notdef_outline = True
opts.drop_tables += ['GSUB', 'GSUS']
opts.layout_features = []
opts.hinting = False

subsetter = Subsetter(options=opts)
subsetter.populate(unicodes=[by_name[n] for n in keep])
subsetter.subset(font)

font.flavor = 'woff2'
font.save(OUT)

json.dump({n: by_name[n] for n in keep}, open(CP_JSON, 'w'), indent=2, sort_keys=True)

print(f'{OUT}: {os.path.getsize(OUT):,} bytes for {len(keep)} icons')
print(f'{CP_JSON}: {len(keep)} entries')
