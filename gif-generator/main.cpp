// GIF Generator - Combine image frames into animated GIF

#include <iostream>
#include <vector>
#include <string>
#include <filesystem> // C++17

namespace fs = std::filesystem;

struct Frame {
    std::vector<unsigned char> pixels;
    int width, height;
    int delay_ms;  // Delay before next frame
};

// Placeholder: load all PNG files from a directory
std::vector<std::string> getFrameFiles(const std::string& directory) {
    // TODO: iterate through directory
    // TODO: filter for .png or .jpg files
    // TODO: sort by filename
    return {};
}

// Placeholder: load frames using stb_image
std::vector<Frame> loadFrames(const std::vector<std::string>& files) {
    // TODO: for each file, load with stbi_load()
    // TODO: store pixel data, width, height
    // TODO: set default delay (e.g., 100ms)
    return {};
}

// Placeholder: export to GIF
void exportGif(const std::vector<Frame>& frames, const std::string& output) {
    // TODO: encode frames into GIF format
    // consider gif.h or calling ImageMagick via system()
}

int main(int argc, char* argv[]) {
    std::cout << "GIF Generator Starter\n";

    // TODO: Accept directory as command-line argument
    std::string frameDir = "frames/";  // Default

    if (argc > 1) {
        frameDir = argv[1];
    }

    // Step 1: Find all frame files
    auto files = getFrameFiles(frameDir);

    // Step 2: Load frames into memory
    auto frames = loadFrames(files);

    // Step 3: Export to GIF
    exportGif(frames, "output.gif");

    std::cout << "TODO: Implement frame loading and GIF encoding\n";

    return 0;
}
