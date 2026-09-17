# Installing Cool Retro Term on Arch Linux

Written September 17, 2026 for Arch Linux, Hyprland (Wayland), fish, and Intel HD 620 graphics with Mesa.

## 1. Install

Install the official Arch package and update the system:

```fish
sudo pacman -Syu cool-retro-term
```

Pacman installs the required Qt6 and qmltermwidget dependencies. No AppImage or AUR helper is needed. The version used on this machine was `2.0.0beta2-1`. [Arch package details](https://archlinux.org/packages/extra/x86_64/cool-retro-term/)

## 2. Launch

```fish
cool-retro-term
```

You can also search for **Cool Retro Term** in the app launcher. To bypass any old wrapper, run:

```fish
/usr/bin/cool-retro-term
```

## 3. Get the amber CRT appearance

Close all Cool Retro Term windows first, then run:

```fish
/usr/bin/cool-retro-term --profile "Default Amber"
```

Close the app normally afterward to save its settings. Future launches should use the saved profile. You can also access profile and effect settings from the terminal's right-click menu.

Default Amber includes orange text, bloom, burn-in, screen curvature, noise, and a visible CRT frame. These are built into the app; no extra theme download is required. [Upstream profiles](https://github.com/Swordfish90/cool-retro-term/blob/master/app/qml/ApplicationSettings.qml)

For a fuller preview, run inside the terminal:

```fish
ls -la
```

An empty prompt shows less glowing text than the project's screenshots, but the curved screen and frame should still be visible.

## 4. If the command fails

Check which executable fish finds:

```fish
type -a cool-retro-term
```

On this machine, an old `~/.local/bin/cool-retro-term` script pointed to a deleted AppImage and shadowed `/usr/bin/cool-retro-term`. If you find the same problem, inspect the script before moving it aside:

```fish
cat ~/.local/bin/cool-retro-term
mv -i ~/.local/bin/cool-retro-term ~/.local/bin/cool-retro-term.old
```

Only do this if that file is an obsolete wrapper. Try launching again.

## 5. If the app launcher fails

A personal desktop entry can override the package's working entry. Inspect it:

```fish
cat ~/.local/share/applications/cool-retro-term.desktop
```

If its `Exec=` line points to a deleted wrapper or AppImage, back it up and copy the package entry:

```fish
mv -i ~/.local/share/applications/cool-retro-term.desktop ~/.local/share/applications/cool-retro-term.desktop.old
cp /usr/share/applications/cool-retro-term.desktop ~/.local/share/applications/cool-retro-term.desktop
```

For a fixed executable path, edit both `Exec=cool-retro-term` lines in the copied file to:

```ini
Exec=/usr/bin/cool-retro-term
```

Close and reopen the launcher. If `update-desktop-database` is installed, you can also run:

```fish
update-desktop-database ~/.local/share/applications
```

## 6. Where the real settings live

This version stores its active profile in a Qt QML SQLite database under:

```text
~/.local/share/cool-retro-term/cool-retro-term/QML/OfflineStorage/Databases/
```

The active profile is the `_CURRENT_PROFILE` row in the database's `settings` table. Editing `~/.config/cool-retro-term/cool-retro-term.conf` did **not** change the appearance in our setup. Prefer the app's profile menu or `--profile "Default Amber"` instead of editing the database manually. [Upstream storage implementation](https://github.com/Swordfish90/cool-retro-term/blob/master/app/qml/Storage.qml)

Our actual fix was to back up the database and replace the saved red, transparent profile with the upstream Default Amber profile. A screenshot then confirmed amber glow, curvature, noise, and the frame. No Hyprland or fish configuration changes were necessary.

## Useful diagnostic commands

```fish
cool-retro-term --help
cool-retro-term --version
cool-retro-term --verbose
```

Project: [Swordfish90/cool-retro-term](https://github.com/Swordfish90/cool-retro-term)
