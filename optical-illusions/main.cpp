// Optical Illusion Generator - Create mind-bending patterns

#include <iostream>
#include <vector>
#include <cmath>

struct Pixel {
    unsigned char r, g, b;
};

// Generate horizontal stripes
void generateStripes(std::vector<Pixel>& pixels, int width, int height, int stripeWidth) {
    // TODO: alternate white/black rows every stripeWidth pixels
}

// Generate concentric circles (moiré pattern)
void generateCircles(std::vector<Pixel>& pixels, int width, int height, int spacing) {
    // TODO: use distance from center to decide black/white rings
}

// Placeholder: rotate pattern around center
void rotatePattern(std::vector<Pixel>& pixels, int width, int height, float angle) {
    // TODO: apply rotation matrix to each pixel coordinate
}

// Placeholder: checkerboard with perspective warp
void generatePerspectiveGrid(std::vector<Pixel>& pixels, int width, int height) {
    // TODO: draw checkerboard then apply perspective transform
}

int main() {
    std::cout << "Optical Illusion Generator Starter\n";

    int width = 512, height = 512;
    std::vector<Pixel> pixels(width * height);

    // Generate different patterns
    // Uncomment to try:

    // generateStripes(pixels, width, height, 10);
    generateCircles(pixels, width, height, 20);
    // rotatePattern(pixels, width, height, 0.785);  // 45 degrees
    // generatePerspectiveGrid(pixels, width, height);

    // TODO: Save with stb_image_write
    // stbi_write_png("illusion.png", width, height, 3, pixels.data(), width * 3);

    std::cout << "Pattern generated\n";
    std::cout << "TODO: Save output, try different patterns, add animation\n";

    return 0;
}
