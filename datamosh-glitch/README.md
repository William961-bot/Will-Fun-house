# Datamosh / Glitch Image Experiment

Create glitch art by intentionally corrupting image data.

## Goal

Explore controlled chaos: pixel shifts, channel offsets, sorting algorithms on pixels.

## Techniques

- RGB channel displacement
- Pixel sorting (by brightness, hue, etc.)
- Random corruption
- Block shuffling

## Dependencies

- stb_image / stb_image_write

## Next Steps

1. Implement channel offset (shift R/G/B separately)
2. Sort pixels in horizontal slices
3. Add random noise/corruption
4. Experiment with feedback loops

## Compile

```
g++ main.cpp -o glitcher
```
