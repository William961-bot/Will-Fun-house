// Simple Image Viewer - Display images in a window

// #include <SFML/Graphics.hpp>  // Uncomment when SFML is installed
#include <iostream>
#include <string>
#include <vector>

/*
// Placeholder: get list of images in directory
std::vector<std::string> getImageFiles(const std::string& directory) {
    // TODO: Scan directory for .png, .jpg, .bmp files
    // TODO: Sort alphabetically
    std::vector<std::string> files = {"image1.png", "image2.png"};
    return files;
}

int main(int argc, char* argv[]) {
    std::cout << "Simple Image Viewer Starter\n";

    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " <image_file>\n";
        return 1;
    }

    std::string imagePath = argv[1];

    // TODO: Load texture
    // sf::Texture texture;
    // if (!texture.loadFromFile(imagePath)) {
    //     std::cerr << "Failed to load image: " << imagePath << "\n";
    //     return 1;
    // }

    // TODO: Create sprite
    // sf::Sprite sprite(texture);

    // TODO: Create window
    // sf::RenderWindow window(sf::VideoMode(800, 600), "Image Viewer");

    // Main loop
    // while (window.isOpen()) {
    //     sf::Event event;
    //     while (window.pollEvent(event)) {
    //         if (event.type == sf::Event::Closed)
    //             window.close();
    //
    //         // TODO: Handle keyboard (Escape to quit, arrows for next/prev)
    //         // TODO: Handle mouse wheel for zoom
    //     }
    //
    //     window.clear(sf::Color::Black);
    //     window.draw(sprite);
    //     window.display();
    // }

    std::cout << "TODO: Install SFML and uncomment code\n";
    std::cout << "Image to load: " << imagePath << "\n";

    return 0;
}
*/

// Stub main for compilation without SFML
int main(int argc, char* argv[]) {
    std::cout << "Simple Image Viewer Starter\n";
    std::cout << "TODO: Install SFML library\n";
    std::cout << "  Linux: sudo apt install libsfml-dev\n";
    std::cout << "  macOS: brew install sfml\n";
    std::cout << "  Windows: Download from https://www.sfml-dev.org/\n";
    std::cout << "\nThen uncomment the code above and compile with:\n";
    std::cout << "  g++ main.cpp -o viewer -lsfml-graphics -lsfml-window -lsfml-system\n";

    if (argc > 1) {
        std::cout << "\nImage specified: " << argv[1] << "\n";
    }

    return 0;
}
