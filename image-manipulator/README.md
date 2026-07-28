# Image Manipulator

Load an image, access pixels, and apply basic transformations.

## Goal

Learn to work with raw pixel data and implement simple filters.

## Dependencies

- **stb_image.h** / **stb_image_write.h** (single-header libraries)
  - Download from: https://github.com/nothings/stb

## Next Steps

1. Implement invert filter
2. Add glitch effects (channel shift, pixel swap)
3. Try blur/sharpen (convolution kernels)
4. Save output to file

## Compile and Run

Using the Makefile:

```
make test
```

This compiles `main_simple.cpp` into `simple_test` and runs it. The result is saved to `out_simple.png`.

Or build manually:

```
g++ -std=c++17 main_simple.cpp -o simple_test
./simple_test
```

## Learning Resources (No AI Required)

If you get stuck on `applyBlur` or other filters, these are the places to look:

- **Your own code** — `learn.cpp` already has step-by-step TODO comments for the box-blur algorithm.
- **Szeliski** — *Computer Vision: Algorithms and Applications* (free PDF), chapter on filtering.
- **Wikipedia** — Box blur, Gaussian blur, kernel (image processing).
- **Real-Time Rendering** — has 3x3 / 5x5 convolution examples.
- **OpenCV source** — `imgproc/src/filter.cpp` shows real C++ convolution.
- **GeeksforGeeks** — "Image Blurring using OpenCV" (concepts translate to plain C++).
- **YouTube** — The Coding Train "Image Filtering", Sebastian Lague "Convolution".
- **Stack Overflow** — search `c++ box blur image` for the exact neighbor-loop pattern.
