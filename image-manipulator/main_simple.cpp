// main_simple.cpp - Test runner for image effects
// Run: make test

// Tell stb headers to implement their code in this file
#define STB_IMAGE_IMPLEMENTATION
#define STB_IMAGE_WRITE_IMPLEMENTATION

// Libraries we use
#include <iostream>   // for printing to console
#include <vector>     // for std::vector (dynamic array)
#include <cstring>    // for memcpy (copy raw bytes)

// Load and save image files
#include "stb_image.h"
#include "stb_image_write.h"

// Our effects (Pixel struct and apply functions)
#include "learn.cpp"

int main() {
    // Hardcoded test image - change this to test different files
    const char* input = "gen.jpeg";

    // Where the result gets saved
    const char* output = "out_simple.png";

    // Load image from disk
    // stbi_load gives us width, height, channels, and raw pixel data
    int w, h, c;
    unsigned char* raw = stbi_load(input, &w, &h, &c, 3);

    // If loading failed, raw will be null
    if (!raw) {
        std::cout << "Failed to load: " << input << "\n";
        return 1;  // exit with error code
    }

    // Copy raw bytes into our Pixel vector
    // 3 bytes per pixel (R, G, B), w * h total pixels
    std::vector<Pixel> pixels(w * h);
    memcpy(pixels.data(), raw, w * h * 3);

    // Free the raw memory from stbi_load
    stbi_image_free(raw);

    // Print status so we know it loaded
    std::cout << "Loaded " << w << "x" << h << " pixels\n";

    // seed random number generator so noise looks different each run
    srand(1);

    // Call the effect we want to test
    applyFlip(pixels, w, h, "h");

    // Save the result back to disk
    stbi_write_png(output, w, h, 3, pixels.data(), w * 3);
    std::cout << "Saved: " << output << "\n";

    return 0;
}
