// Flipper Zero Tools
// Generates .sub files, .nfc files, and USB export

#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <algorithm>
#include <cstring>
#include <sys/stat.h>
#include <unistd.h>

// Flipper expects .sub files in the SubGHz folder
// Each line is a frequency/preset definition plus raw data
void write_subghz_file(const std::string& filename,
                       int frequency_mhz,
                       const std::string& preset,
                       const std::string& data) {
    // TODO: write SubGhz RAW File format to payloads/filename
}

// Flipper .nfc files are XML containing UID and data blocks
void write_nfc_file(const std::string& filename,
                    const std::string& uid,
                    const std::string& data) {
    // TODO: write NFC file format to payloads/filename
}

// Flipper .ir files are key-value pairs
void write_ir_file(const std::string& filename,
                   const std::string& name,
                   const std::string& type,
                   const std::string& code) {
    // TODO: write IR remote file format to payloads/filename
}

// Flipper BadUSB is just a script that types lines
void write_badusb_file(const std::string& filename,
                       const std::vector<std::string>& lines) {
    // TODO: write BadUSB script to payloads/filename
}

// Detect USB drives and copy files to them
bool copy_to_usb(const std::string& src_dir) {
    // TODO: scan /media/$USER/ and /run/media/$USER/ for mounted drives
    // TODO: copy all payloads into the first matching mount
    return false;
}

void menu_example_subghz() {
    // TODO: prompt for frequency, preset, and raw data
    // TODO: call write_subghz_file() with user input
}

void menu_example_nfc() {
    // TODO: prompt for UID and payload data
    // TODO: call write_nfc_file() with user input
}

void menu_example_ir() {
    // TODO: prompt for button name, type, and code
    // TODO: call write_ir_file() with user input
}

void menu_example_badusb() {
    // TODO: prompt for number of lines and each line
    // TODO: call write_badusb_file() with user input
}

void menu_export_usb() {
    // TODO: call copy_to_usb() with payloads folder
}

int main() {
    struct stat st = {0};
    if (stat("payloads", &st) != 0) mkdir("payloads", 0755);

    std::cout << "\n=== Flipper Zero Tool Generator ===\n";
    while (true) {
        std::cout << "\n1) Create Sub-GHz file\n";
        std::cout << "2) Create NFC file\n";
        std::cout << "3) Create IR file\n";
        std::cout << "4) Create BadUSB script\n";
        std::cout << "5) Export payloads to USB drive\n";
        std::cout << "0) Quit\n";
        std::cout << "> ";
        int c; std::cin >> c;
        if (c == 0) break;
        std::cin.ignore();
        if (c == 1) menu_example_subghz();
        else if (c == 2) menu_example_nfc();
        else if (c == 3) menu_example_ir();
        else if (c == 4) menu_example_badusb();
        else if (c == 5) menu_export_usb();
        else std::cout << "Invalid choice\n";
    }
    return 0;
}
