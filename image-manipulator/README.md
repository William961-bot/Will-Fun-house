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
