# Flipper Zero Tools - Payload Generator

Generates Flipper Zero compatible payload files that you can copy to your SD card.

What it does:
- Creates Sub-GHz signal files (.sub files)
- Creates NFC payloads (.nfc files)
- Creates infrared remote files (.ir files)
- Creates BadUSB scripts (.txt)
- Copies files to a USB drive when you plug it in

## Build

g++ main.cpp -o flipper-gen

## Usage

./flipper-gen
Then follow the menu to:
1. Create Sub-GHz payloads
2. Create NFC payloads
3. Create IR remote files
4. Create BadUSB scripts
5. Export everything to USB drive
