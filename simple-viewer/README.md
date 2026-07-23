# Simple Image Viewer

Display images in a window with minimal UI.

## Goal

Learn basic windowing and graphics with SFML.

## Features

- Load and display image
- Simple event loop
- Optional: zoom, pan, next/previous image

## Dependencies

- **SFML** (Simple and Fast Multimedia Library)
  - Install: `sudo apt install libsfml-dev` (Linux)
  - Or download from: https://www.sfml-dev.org/

## Next Steps

1. Load image with sf::Texture
2. Display in window
3. Add keyboard controls (arrows for next/prev, Q to quit)
4. Add zoom with mouse wheel

## Compile

```
g++ main.cpp -o viewer -lsfml-graphics -lsfml-window -lsfml-system
```
