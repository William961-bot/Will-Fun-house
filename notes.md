# Notes - Things I Learn



## clamp()
Old version: `int clamp(int v)` — always 0 to 255
New version: `int clamp(int low, int high, int v)`
Purpose: keeps pixel values from going outside valid range
When: always use after doing math on pixel values
Call example: `clamp(p[i].r + amt, 0, 255)`
Parameters:
  low  → minimum allowed value
  high → maximum allowed value
  v    → value to clamp
Logic:
  if v < low  → low
  if v > high → high
  otherwise   → v
VS Code red squiggle: if function signature and calls don't match, arguments like 0 get underlined



## for loop
Use when you know the count ahead of time (like p.size())
Example: for(int i = 0; i < p.size(); i++)


## averages in code
Add all values first inside parentheses, then divide
Example: int avg = (r + g + b) / 3;


## struct fields
A struct like Pixel has separate r, g, b slots
You must write to each one individually
Calculating a value in a variable (like avg) does NOT change the struct
You have to assign back: p[i].r = avg; etc.



## invert
Flip each channel with 255 - value

## things i struggled with
- remembering that ALL 3 channels use 255 - (not different numbers)
- realizing invert means 255 - value, not negative values
- had to be reminded that pixels can't go below 0 or above 255
- kept mixing up which numbers to write (tried 0 and 180 at first)

## brightness
- parameter `int amt` is how much to brighten each pixel
- pattern: for each channel, new value = channel + amt, then wrap in clamp(..., 0, 255)
- without clamp(), unsigned char wraps around instead of capping at 255
- must update each channel individually: p[i].r, p[i].g, p[i].b
- key insight: same letter on both sides: `p[i].r = clamp(p[i].r + amt, 0, 255);`

## contrast
- center is 128 (middle gray)
- basic idea: take distance from 128, multiply it, then add 128 back
- pattern: `clamp((channel - 128) * factor + 128, 0, 255)`
- used factor 2 in our version: higher numbers make contrast stronger
- must update all 3 channels separately
- old clamp version: `int clamp(int v)` with hardcoded 0 and 255

## channel shift
- copies each RGB channel from a different horizontal position
- creates color fringing / glitch look
- needs TWO arrays: read from original, write to output
- if we write into same array directly, we overwrite pixels we still need to read
- use `std::vector<Pixel> out(p.size());` as temporary output buffer
- after the loop, copy shifted result back: `p = out;`
- get x position from current index: `int x = i % w;`
- get y position from current index: `int y = i / w;`
- source x positions: `rx = x + rShift`, `gx = x + gShift`, `bx = x + bShift`
- bounds check pattern: `(rx >= 0 && rx < w) ? p[y*w+rx].r : (unsigned char)0`
- `(unsigned char)0` stops VS Code red squiggle: ternary mixes unsigned char with int

## noise
- adds random colored speckles to approximately `amount`% of pixels
- `srand()` goes in main_simple.cpp (not in learn.cpp), before calling any effects
- `srand(1)` seeds so noise looks same every run; use `srand(time(0))` for different each run
- `rand() % 100 < amount` rolls 0-99; if below amount, that pixel gets noise
- noisy pixel gets completely random color: `p[i].r = rand() % 256;` etc. for g and b
- no return needed — function returns void, modifies `p` directly
- `rand() % 256` gives a random number between 0 and 255
- `rand() % 100` gives a random number between 0 and 99
- `<cstdlib>` header is needed for `rand()` and `srand()`
- BUG WATCH: stray semicolon after `if` kills the block — `if(...);` means the if does nothing

## flip
- mirror image with `opt == "h"` (horizontal) or `opt == "v"` (vertical)
- still uses two arrays: `std::vector<Pixel> out(p.size());`
- horizontal: mirror the column, `mx = w - 1 - x`, read from `p[y * w + mx]`
- vertical: mirror the row, `my = h - 1 - y`, read from `p[my * w + x]`
- `p = out;` at the end copies result back
