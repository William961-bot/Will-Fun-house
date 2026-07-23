// ASCII Video - starter scaffold
// Uses OpenCV to read video, convert frames to text, display in terminal

#include <iostream>
#include <string>
#include <vector>

// Uncomment when OpenCV is installed:
// #include <opencv2/opencv.hpp>

// Placeholder: convert one video frame to ASCII string
std::string frameToAscii(int width, int height, int frameNum) {
    // TODO: read actual frame from video
    // TODO: convert to grayscale
    // TODO: resize to target character width
    // TODO: map brightness to ASCII ramp
    return "";
}

// Placeholder: play video frames in terminal
void playVideo(const std::string& path, int cols) {
    // TODO: open video with cv::VideoCapture
    // TODO: loop while cap.read(frame)
    // TODO: call frameToAscii each frame
    // TODO: clear terminal and print ASCII frame
    // TODO: handle Ctrl+C to quit
}

int main(int argc, char* argv[]) {
    std::cout << "ASCII Video Starter\n";

    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " <video.mp4> [columns]\n";
        return 1;
    }

    std::string videoPath = argv[1];
    int columns = 80;
    if (argc >= 3) {
        columns = std::stoi(argv[2]);
    }

    // Generate a test pattern instead of real video
    std::cout << "Generating test ASCII pattern...\n";
    for (int i = 0; i < 5; i++) {
        std::string frame = frameToAscii(columns, 20, i);
        std::cout << frame << "\n";
    }

    std::cout << "TODO: Install OpenCV and uncomment code\n";
    std::cout << "  Linux: sudo apt install libopencv-dev\n";
    std::cout << "  macOS: brew install opencv\n";

    return 0;
}
