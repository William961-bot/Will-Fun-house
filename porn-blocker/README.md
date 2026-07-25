# Porn Blocker

Android: DNS blocklist + VPNService filter + WebView/browser filter.
Stack: Java only.

Status: BUILD SUCCESS.
APK: /home/willnut/Downloads/stuff/creative-coding-cpp/porn-blocker/app/build/outputs/apk/debug/app-debug.apk

## Components
- MainActivity.java - UI with VPN toggle and in-app browser
- BlockerVpnService.java - VPNService for network filtering
- BlocklistManager.java - Domain blocklist (hardcoded + raw resource)
- SimpleBrowser.java - WebView with URL filtering

## To run
1. Install APK on Android device or emulator
2. Tap "Start Protection" → grant VPN permission
3. Use browser to test blocked domains