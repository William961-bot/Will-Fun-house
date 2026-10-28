"""Pack the MUGEN sprites of Ichigo Vasto Lorde (StormEX) into assets/ichigo/mugen.png (+ mugen-alt.png, the second palette) and write
src/ichigo-atlas.js, the clip table render-ichigo.js reads. Local only: assets/ichigo/ is git-ignored.
Usage: python tools/pack-ichigo-mugen.py <extracted Ichigo folder (sprites/, Animetion/, pals/)>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import mugen_sff as m
from PIL import Image

SCALE = 1.5
SIZE, COLS, ANCHOR = 320, 12, (160, 260)
ROOT = os.path.join(os.path.dirname(__file__), '..')
folder = sys.argv[1]
sp = m.read_sff(os.path.join(folder, 'sprites', 'StormEX-Ichigo.sff')); air = m.read_air(os.path.join(folder, 'Animetion', 'StormEX-Ichigo.air'))
PALETTES = {'mugen.png': 'Ichigo.act', 'mugen-alt.png': sys.argv[2] if len(sys.argv) > 2 else 'Ichigo6.act'}

# key: (Mugen action, frames sampled, game tick the hit lands, game ticks in the move). Attack clips are time-warped
# so the Mugen strike frame lands on the Hoodratz startup; render-ichigo.js then just plays stateFrame / total ticks.
CLIPS = dict(
    idle=(20, 12, None, None), walk=(20, 8, None, None), backward=(21, 8, None, None), dash=(100, 6, None, None),
    backdash=(105, 2, None, None), air=(42, 4, None, None), land=(47, 2, None, None), crouch=(11, 1, None, None),
    block=(130, 1, None, None), light=(200, 8, 5, 18), medium=(210, 10, 9, 26), low=(400, 6, 7, 23),
    lowMedium=(410, 8, 11, 31), heavy=(220, 12, 28, 57), overhead=(420, 10, 14, 32), airLight=(600, 6, 6, 17),
    airMedium=(610, 8, 7, 21), airHeavy=(620, 8, 12, 31), grab=(710, 8, None, None), grabMiss=(710, 4, None, None),
    hit=(5070, 4, None, None), ko=(5120, 3, None, None), escape=(5120, 3, None, None),
    getsuga=(700, 10, None, None), flash=(500, 8, None, None), steel=(1120, 10, 7, 41),
    fullcut=(1021, 10, 9, 43), blackGetsuga=(3101, 10, None, None),
)

def frame_at(frames, tick):
    t = 0
    for f in frames:
        t += max(1, f['t'])
        if tick < t: return f
    return frames[-1]

FIT = [1.0]   # per-clip shrink so wide poses fit the cell; render-*.js scales them back up by 1/fit
def cell_for(f, pal):
    cell = Image.new('RGBA', (SIZE, SIZE)); s = sp[(f['grp'], f['idx'])]
    img = m.colorize(s, pal); img = img.resize((max(1, round(img.width * (SCALE * FIT[0]))), max(1, round(img.height * (SCALE * FIT[0])))), Image.NEAREST)
    ax = s['ax'] * (SCALE * FIT[0])
    if 'H' in f['flip']: img = img.transpose(Image.FLIP_LEFT_RIGHT); ax = img.width - ax
    if 'V' in f['flip']: img = img.transpose(Image.FLIP_TOP_BOTTOM)
    x, y = round(ANCHOR[0] + f['x'] * (SCALE * FIT[0]) - ax), round(ANCHOR[1] + (f['y'] - s['ay']) * (SCALE * FIT[0]))
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
    pal = m.read_act(os.path.join(folder, 'pals', act))
    if not fitted:
        fitted = True
        for key, c in clips.items():
            for fit in (1.0, .92, .85, .78, .7, .62):
                FIT[0] = fit
                if not any(cell_for(layout[i], pal)[1] for i in range(c['start'], c['start'] + c['count'])): break
            c['fit'] = fit
    sheet = Image.new('RGBA', (COLS * SIZE, -(-n // COLS) * SIZE))
    for i, f in enumerate(layout):
        FIT[0] = clips[owner[i]]['fit']; cell, over = cell_for(f, pal)
        if over: clipped.update(k for k, c in clips.items() if c['start'] <= i < c['start'] + c['count'])
        sheet.alpha_composite(cell, (i % COLS * SIZE, i // COLS * SIZE))
    sheet.save(os.path.join(ROOT, 'assets/ichigo', out_name), optimize=True)
    print(out_name, sheet.size)
print('frames', n, 'clipped clips:', sorted(clipped), 'fits:', {k: c['fit'] for k, c in clips.items() if c['fit'] < 1})

atlas = dict(size=SIZE, columns=COLS, anchor=list(ANCHOR), frames=n, clips=clips)
open(os.path.join(ROOT, 'src/ichigo-atlas.js'), 'w').write(
    '// Ichigo (MUGEN, by StormEX) clip table. Generated by tools/pack-ichigo-mugen.py; the sheets in assets/ichigo/ stay local.\n'
    'const ICHIGO_ATLAS=' + json.dumps(atlas, separators=(',', ':')) + ';\n')
