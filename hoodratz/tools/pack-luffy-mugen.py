"""Pack the MUGEN sprites of Luffy (GreatLuffy by Dr.T, sprites by Ploaj) into assets/luffy/mugen.png (+ mugen-alt.png, the second palette) and write
src/luffy-atlas.js, the clip table render-luffy.js reads. Local only: assets/luffy/ is git-ignored.
Usage: python tools/pack-luffy-mugen.py <extracted GreatLuffy folder (Luffy.sff, Luffy.air, Luffy.act); the mirror sheet swaps red and blue>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import mugen_sff as m
from PIL import Image

SCALE = 1.3
SIZE, COLS, ANCHOR = 320, 12, (95, 262)
ROOT = os.path.join(os.path.dirname(__file__), '..')
folder = sys.argv[1]
sp = m.read_sff(os.path.join(folder, 'Luffy.sff')); air = m.read_air(os.path.join(folder, 'Luffy.air'))
PALETTES = {'mugen.png': 'Luffy.act', 'mugen-alt.png': 'swap'}

# key: (Mugen action, frames sampled, game tick the hit lands, game ticks in the move). Attack clips are time-warped
# so the Mugen strike frame lands on the Hoodratz startup; render-luffy.js then just plays stateFrame / total ticks.
CLIPS = dict(
    idle=(0, 6, None, None), walk=(20, 8, None, None), backward=(21, 8, None, None), dash=(100, 6, None, None),
    backdash=(105, 2, None, None), air=(41, 2, None, None), land=(47, 1, None, None), crouch=(11, 1, None, None),
    block=(130, 1, None, None), light=(200, 5, 5, 18), medium=(210, 7, 9, 26), low=(400, 4, 7, 23),
    lowMedium=(440, 6, 11, 31), heavy=(240, 6, 28, 57), overhead=(230, 7, 14, 32), airLight=(600, 4, 6, 17),
    airMedium=(610, 5, 7, 21), airHeavy=(640, 9, 12, 31), grab=(840, 8, None, None), grabMiss=(810, 7, None, None),
    hit=(5000, 2, None, None), ko=(5120, 5, None, None), escape=(5200, 1, None, None),
    gatling=(840, 8, 8, 46), bazooka=(860, 6, 12, 46), axe=(230, 7, 8, 42), elephantGun=(880, 12, 16, 58), jetPistol=(211, 11, 11, 32),
    rain=(850, 10, 8, 42), gear4=(920, 15, None, None),
)

def frame_at(frames, tick):
    t = 0
    for f in frames:
        t += max(1, f['t'])
        if tick < t: return f
    return frames[-1]

SWAP = [False]
FIT = [1.0]   # per-clip shrink so wide poses fit the cell; render-*.js scales them back up by 1/fit
def cell_for(f, pal):
    cell = Image.new('RGBA', (SIZE, SIZE)); s = sp[(f['grp'], f['idx'])]
    img = m.colorize(s, pal)
    bb = img.getbbox() or (0, 0, 1, 1); img = img.crop(bb); ax = s['ax'] - bb[0]; ay = s['ay'] - bb[1]   # many sprites sit on huge empty canvases
    if SWAP[0]:
        r, g_, b, a_ = img.split(); img = Image.merge('RGBA', (b, g_, r, a_))
    if 'H' in f['flip']: img = img.transpose(Image.FLIP_LEFT_RIGHT); ax = img.width - ax
    if 'V' in f['flip']: img = img.transpose(Image.FLIP_TOP_BOTTOM)
    k = SCALE * FIT[0]
    # Stretched rubber arms are far longer than a cell: cut a band out of the middle of the straight arm, keeping the body and the fist.
    reach = (SIZE - (ANCHOR[0] + f['x'] * k - ax * k)) / k
    keep_right = 190
    if img.width > reach and img.width > 520 and reach > ax + 110 + keep_right:
        left = int(ax + 110); right = keep_right; gap = int(reach - left - right)
        cut = img.width - left - right - gap
        if cut > 0:
            parts = (img.crop((0, 0, left, img.height)), img.crop((img.width - right - gap, 0, img.width, img.height)))
            joined = Image.new('RGBA', (left + right + gap, img.height)); joined.alpha_composite(parts[0], (0, 0)); joined.alpha_composite(parts[1], (left, 0)); img = joined
    img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.NEAREST)
    ax = ax * k
    x, y = round(ANCHOR[0] + f['x'] * k - ax), round(ANCHOR[1] + (f['y'] - ay) * k)
    box = (max(0, -x), max(0, -y), min(img.width, SIZE - x), min(img.height, SIZE - y))
    if box[2] > box[0] and box[3] > box[1]: cell.alpha_composite(img.crop(box), (max(0, x), max(0, y)))
    return cell, x < 0 or y < 0 or x + img.width > SIZE or y + img.height > SIZE

# Layout and sampling are palette-independent, so work out which Mugen frame each atlas frame uses once.
layout, clips, n = [], {}, 0
for key, (action, count, contact, total) in CLIPS.items():
    frames = [f for f in air[action] if (f['grp'], f['idx']) in sp]
    span = sum(max(1, f['t']) for f in frames)
    hit_at = next((sum(max(1, g['t']) for g in frames[:i]) for i, f in enumerate(frames) if f['hit']), None)
    fm = hit_at / span if hit_at is not None else None
    at = min(.8, contact / total) if contact and total else None
    clips[key] = dict(start=n, count=count, ticks=span)
    for i in range(count):
        u = i / max(1, count - 1)
        if fm and at: u = fm * u / at if u < at else fm + (1 - fm) * (u - at) / (1 - at)
        layout.append(frame_at(frames, min(span - 1, u * (span - 1)))); n += 1

owner = [k for k, c in clips.items() for _ in range(c['count'])]
clipped = set()
fitted = False
for out_name, act in PALETTES.items():
    pal = m.read_act(os.path.join(folder, 'Luffy.act')); swap = act == 'swap'
    if not fitted:
        fitted = True
        for key, c in clips.items():
            for fit in (1.0, .92, .85, .78, .7, .62, .55, .5, .45, .4):
                FIT[0] = fit
                if not any(cell_for(layout[i], pal)[1] for i in range(c['start'], c['start'] + c['count'])): break
            c['fit'] = fit
    sheet = Image.new('RGBA', (COLS * SIZE, -(-n // COLS) * SIZE))
    for i, f in enumerate(layout):
        FIT[0] = clips[owner[i]]['fit']; SWAP[0] = swap; cell, over = cell_for(f, pal)
        if over: clipped.update(k for k, c in clips.items() if c['start'] <= i < c['start'] + c['count'])
        sheet.alpha_composite(cell, (i % COLS * SIZE, i // COLS * SIZE))
    sheet.save(os.path.join(ROOT, 'assets/luffy', out_name), optimize=True)
    print(out_name, sheet.size)
print('frames', n, 'clipped clips:', sorted(clipped), 'fits:', {k: c['fit'] for k, c in clips.items() if c['fit'] < 1})

atlas = dict(size=SIZE, columns=COLS, anchor=list(ANCHOR), frames=n, clips=clips)
open(os.path.join(ROOT, 'src/luffy-atlas.js'), 'w').write(
    '// Luffy (MUGEN GreatLuffy) clip table. Generated by tools/pack-luffy-mugen.py; the sheets in assets/luffy/ stay local.\n'
    'const LUFFY_ATLAS=' + json.dumps(atlas, separators=(',', ':')) + ';\n')
