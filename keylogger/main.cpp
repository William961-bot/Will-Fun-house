// Keylogger - starter scaffold
// Tracks keystrokes, logs to file, shows live stats

#include <iostream>
#include <fstream>
#include <map>
#include <string>

// Uncomment when ncurses is installed:
// #include <ncurses.h>
// #include <termios.h>
// #include <unistd.h>

// Placeholder: record a single key press
void recordKey(char c) {
    // TODO: Append key to log file
    // TODO: Update stats (total keys, per-key counts)
}

// Placeholder: display live statistics
void showStats() {
    // TODO: Clear screen with ANSI codes
    // TODO: Print total keys, elapsed time, keys/min
    // TODO: Print top 5 most used keys
    std::cout << "TODO: Implement live stats display\n";
}

// Placeholder: capture keyboard input
void captureKeys() {
    // TODO: Set terminal to raw/noecho mode
    // TODO: Loop and read each keypress
    // TODO: Call recordKey() for each key
    // TODO: Exit on Ctrl+C
    std::cout << "TODO: Implement keyboard capture\n";
}

int main() {
    std::cout << "Keylogger Starter\n";

    std::string logFile = "keystrokes.log";

    // TODO: Open log file for appending
    // TODO: Start key capture loop
    // TODO: Close file on exit

    std::cout << "TODO: Install ncurses and uncomment includes\n";
    std::cout << "  Linux: sudo apt install libncurses5-dev\n";
    std::cout << "  macOS: brew install ncurses\n";

    // Test pattern: simulate some keystrokes
    std::cout << "\nSimulated test input:\n";
    std::string testInput = "hello world";
    for (char c : testInput) {
        std::cout << c << std::flush;
    }
    std::cout << "\n";

    return 0;
}
