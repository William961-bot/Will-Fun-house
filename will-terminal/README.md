# Will Terminal

A new terminal emulator built from scratch, rather than a fork of cool-retro-term.

Working name: **Will Terminal**. The final name and visual style are still open.

## Goal

Learn how a terminal connects to a shell, interprets terminal escape sequences, and renders a screen. Target system: Arch Linux, Hyprland on Wayland, fish shell, Intel HD 620 with Mesa.

## Status

Project planning stage. No terminal implementation exists yet.

This folder follows the workspace's educational starter approach. Build and understand each component incrementally.

## Proposed stack

C++ with Qt6 would fit this C++ workspace and provide windowing, input handling, and text rendering. This is a proposal; the implementation stack has not been finalized.

The terminal logic should be our own code. Use platform and UI libraries for the window and operating-system interfaces, without copying cool-retro-term or embedding an existing terminal widget.

## First working version

1. Create a window and render a fixed-width text grid.
2. Open a Linux pseudoterminal (PTY), start fish as its child process, and read shell output without blocking the UI.
3. Forward keyboard input to the PTY and display ordinary text, carriage returns, line feeds, and backspaces.
4. Implement cursor movement, clearing, basic ANSI colors, and text attributes with an incremental escape-sequence parser.
5. Keep the screen grid and PTY dimensions synchronized when the window resizes.
6. Add scrollback, text selection, and clipboard copy/paste.
7. Handle shell exit and window closure cleanly.

## Later milestones

- UTF-8, combining characters, and wide character cells.
- Alternate screen and the control sequences needed by programs such as man, less, and vim.
- Configuration for font, colors, and cursor.
- Optional amber CRT appearance: glow, scanlines, curvature, and noise.
- Desktop launcher and installation instructions.

Add visual effects after basic terminal behavior works reliably.

## Validation checklist

- Launch fish and run commands interactively.
- Verify Enter, Backspace, arrow keys, Tab, and Ctrl+C.
- Display colored output and long lines that wrap.
- Resize during command output and verify the shell receives the new dimensions.
- Check scrolling and, once implemented, full-screen applications.
- Confirm closing the terminal does not leave an orphan shell.

## Reference notes

[Cool Retro Term installation and troubleshooting](cool-retro-term-install.md) documents our setup and the settings storage issue we fixed. It is a reference for the desired appearance, not this project's implementation.
