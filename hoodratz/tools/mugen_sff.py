"""Read MUGEN SFF v1 and v2 sprite files and .air animation files (used for the Juri, Ella, Beerus, Ichigo, Art and Ghostface ports)."""
import struct, re
from PIL import Image

def read_sff(path):
    d = open(path, 'rb').read()
    if d[15] == 2: return read_sff2(d)
    if d[:12] != b'ElecbyteSpr\0' or d[12] != 0 or d[15] != 1:
        raise SystemExit('only SFF v1 and v2 are supported')
    count, off = struct.unpack_from('<I', d, 20)[0], struct.unpack_from('<I', d, 24)[0]
    sprites, order, shared = {}, [], None
    while off and len(order) < count:
        nxt, length, ax, ay, grp, idx, link, same = struct.unpack_from('<IIhhhhhB', d, off)
        body = d[off + 32:off + 32 + length] if length else b''
        if body:
            img, pal = decode_pcx(body, shared if same else None)
            if not same or shared is None: shared = pal
            sprites[(grp, idx)] = dict(img=img, pal=pal, ax=ax, ay=ay)
        else:
            src = sprites[order[link]]
            sprites[(grp, idx)] = dict(img=src['img'], pal=src['pal'], ax=ax, ay=ay)
        order.append((grp, idx)); off = nxt
    return sprites

def read_sff2(d):
    """SFF v2: sprite nodes of 28 bytes, palette nodes of 16, 8-bit sprites (raw, RLE8, LZ5) with their own palettes."""
    spr_off, spr_n, pal_off, pal_n, ldata = struct.unpack_from('<IIII', d, 0x24)[0], struct.unpack_from('<I', d, 0x28)[0],         struct.unpack_from('<I', d, 0x2C)[0], struct.unpack_from('<I', d, 0x30)[0], struct.unpack_from('<I', d, 0x34)[0]
    tdata = struct.unpack_from('<I', d, 0x3C)[0]
    pals = []
    for i in range(pal_n):
        g, it, ncol, link, off, length = struct.unpack_from('<HHHHII', d, pal_off + i * 16)
        src = pals[link] if length == 0 and link < i else None
        if src is None:
            raw = d[ldata + off:ldata + off + ncol * 4]
            src = bytes(b for c in range(ncol) for b in raw[c * 4:c * 4 + 3]).ljust(768, b'\x00')
        pals.append(src)
    sprites, order = {}, []
    for i in range(spr_n):
        g, it, w, h, ax, ay, link, fmt, depth, off, length, pi, flags = struct.unpack_from('<HHHHhhHBBIIHH', d, spr_off + i * 28)
        if length == 0 or fmt == 1:
            src = sprites[order[link]]
            sprites[(g, it)] = dict(img=src['img'], pal=pals[pi] if pi < len(pals) else src['pal'], ax=ax, ay=ay)
        else:
            body = d[(tdata if flags & 1 else ldata) + off:][:length]
            if fmt == 0: px = body
            else:
                size = struct.unpack_from('<I', body, 0)[0]
                px = {2: rle8, 4: lz5}[fmt](body[4:], size) if fmt in (2, 4) else None
                if px is None: raise SystemExit(f'unsupported SFF v2 format {fmt}')
            img = Image.frombytes('P', (w, h), bytes(px[:w * h]).ljust(w * h, b'\x00'))
            sprites[(g, it)] = dict(img=img, pal=pals[pi] if pi < len(pals) else pals[0], ax=ax, ay=ay)
        order.append((g, it))
    return sprites

def rle8(src, size):
    out, i = bytearray(), 0
    while len(out) < size and i < len(src):
        c = src[i]; i += 1
        if c & 0xC0 == 0x40: out += bytes([src[i]]) * (c & 0x3F); i += 1
        else: out.append(c)
    return out

def lz5(src, size):
    out, i, ctrl, cbit, rb, rbc = bytearray(), 1, src[0], 0, 0, 0
    while len(out) < size and i < len(src):
        d = src[i]; i += 1
        if ctrl & (1 << cbit):                       # back reference
            if d & 0x3F == 0:
                n, d, i = src[i + 1] + 2, ((d << 2) | src[i]) + 1, i + 2
            else:
                rb |= (d & 0xC0) >> rbc; rbc += 2; n = d & 0x3F
                if rbc < 8: d = src[i] + 1; i += 1
                else: d = rb + 1; rb = rbc = 0
            for _ in range(n + 1):
                if len(out) < size: out.append(out[-d])
        else:                                        # literal run
            if d & 0xE0 == 0: n = src[i] + 8; i += 1
            else: n, d = d >> 5, d & 0x1F
            out += bytes([d]) * min(n, size - len(out))
        cbit += 1
        if cbit >= 8: ctrl, cbit = (src[i] if i < len(src) else 0), 0; i += 1
    return out

def decode_pcx(b, pal):
    xmin, ymin, xmax, ymax = struct.unpack_from('<HHHH', b, 4)
    w, h, bpl = xmax - xmin + 1, ymax - ymin + 1, struct.unpack_from('<H', b, 66)[0]
    px, i, out = b[128:], 0, bytearray()
    want = bpl * h
    while len(out) < want and i < len(px):
        c = px[i]; i += 1
        if c >= 0xC0: out += bytes([px[i]]) * (c & 0x3F); i += 1
        else: out.append(c)
    own = None
    if len(b) >= 769 and b[-769] == 12: own = b[-768:]
    if pal is None or (own and not pal): pal = own
    rows = b''.join(bytes(out[y * bpl:y * bpl + w]) for y in range(h))
    im = Image.frombytes('P', (w, h), rows)
    return im, pal

def read_act(path):
    d = open(path, 'rb').read()[:768]
    return bytes(d[(255 - i) * 3 + c] for i in range(256) for c in range(3))  # MUGEN .act is stored reversed

def colorize(sp, palette=None):
    im = sp['img'].copy()
    im.putpalette(palette or sp['pal'])
    rgba = im.convert('RGBA')
    mask = sp['img'].point([0] + [255] * 255, 'L')
    rgba.putalpha(mask)
    return rgba

def read_air(path):
    """Action number -> frames {grp, idx, x, y, t, flip, hit}; hit is True when the frame has attack boxes."""
    actions, cur, default, own = {}, None, 0, None
    for line in open(path, encoding='latin-1'):
        line = line.split(';')[0].strip()
        m = re.match(r'\[begin action (\d+)', line, re.I)
        if m: cur = actions.setdefault(int(m.group(1)), []); default, own = 0, None; continue
        m = re.match(r'clsn1(default)?\s*:\s*(\d+)', line, re.I)
        if m:
            if m.group(1): default = int(m.group(2))
            else: own = int(m.group(2))
            continue
        if cur is None or not line or line[0] == '[' or ':' in line.split(',')[0] or '=' in line: continue
        p = [x.strip() for x in line.split(',')]
        if len(p) >= 5 and re.fullmatch(r'-?\d+', p[0]):
            hit = (own if own is not None else default) > 0
            cur.append(dict(grp=int(p[0]), idx=int(p[1]), x=int(p[2]), y=int(p[3]), t=int(p[4]),
                            flip=p[5] if len(p) > 5 else '', hit=hit)); own = None
    return actions
