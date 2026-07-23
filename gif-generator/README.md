# GIF Generator

Create animated GIFs from image sequences.

## Goal

Learn the basics of frame sequencing and animation timing.

## Approach

- Load multiple image files (frame001.png, frame002.png, etc.)
- Store frame timing metadata
- Export to GIF format (stub only - use library or external tool)

## Dependencies

- stb_image for loading
- **gif.h** (optional lightweight GIF encoder) or call external tool like ImageMagick

## Next Steps

1. Load a sequence of images from folder
2. Set frame delays
3. Use gif.h or system call to combine frames
4. Experiment with loop counts, transparency

## Compile

```
g++ main.cpp -o gifgen
```
