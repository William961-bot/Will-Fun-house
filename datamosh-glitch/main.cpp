// Datamosh / Glitch - Intentional image corruption for artistic effects

#include <iostream>
#include <vector>
#include <algorithm>
#include <cstdlib>
#include <ctime>

struct Pixel {
    unsigned char r, g, b;

    // Helper: calculate brightness
    int brightness() const {
        return (r + g + b) / 3;
    }
};

// Placeholder: shift RGB channels horizontally
void channelOffset(std::vector<Pixel>& pixels, int width, int height, int rShift, int gShift, int bShift) {
    // TODO: create temp buffers for each channel
    // TODO: copy R/G/B with given horizontal offsets
    // wrap around at edges
}

// Placeholder: sort a row of pixels by brightness
void sortRow(std::vector<Pixel>& pixels, int y, int width) {
    // TODO: extract row from y*width to (y+1)*width
    // TODO: sort by brightness or red channel
}

// Placeholder: add random noise
void addNoise(std::vector<Pixel>& pixels, int amount) {
    // TODO: randomly modify some pixels
    // for each pixel: if rand()%100 < amount, add random value to R/G/B
}

int main() {
    std::srand(std::time(nullptr));

    std::cout << "Datamosh / Glitch Starter\n";

    // TODO: Load image with stb_image
    int width = 320, height = 240;
    std::vector<Pixel> pixels(width * height);

    // Generate test pattern
    for (int i = 0; i < pixels.size(); i++) {
        pixels[i].r = i % 256;
        pixels[i].g = (i / 2) % 256;
        pixels[i].b = 128;
    }

    // Apply glitch effects
    channelOffset(pixels, width, height, 5, -5, 0);  // Shift channels
    sortRow(pixels, height / 2, width);              // Sort middle row
    addNoise(pixels, 10);                             // 10% noise

    // TODO: Save output with stb_image_write

    std::cout << "Glitch effects applied (placeholder)\n";
    std::cout << "TODO: Load real image, implement effects, export\n";

    return 0;
}
