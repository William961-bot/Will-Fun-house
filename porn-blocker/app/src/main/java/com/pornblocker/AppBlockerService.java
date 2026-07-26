package com.pornblocker;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import java.util.HashSet;
import java.util.Set;

public class AppBlockerService extends AccessibilityService {

    private static final String TAG = "AppBlockerService";
    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_BLOCKED_APPS = "blocked_apps";

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_SPOKEN;
        info.notificationTimeout = 100;
        setServiceInfo(info);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        String packageName = event.getPackageName() != null ? event.getPackageName().toString() : null;
        if (packageName == null) return;

        // Check if this app is blocked
        if (isAppBlocked(packageName)) {
            // This app is blocked - show blocked screen
            Intent intent = new Intent(this, BlockedScreenActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
            intent.putExtra("package_name", packageName);
            intent.putExtra("app_name", getAppLabel(packageName));
            startActivity(intent);
        }
    }

    private boolean isAppBlocked(String packageName) {
        if (!BlockerVpnService.isRunning) return false;
        
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> blockedApps = prefs.getStringSet(KEY_BLOCKED_APPS, new HashSet<>());
        return blockedApps.contains(packageName);
    }

    private String getAppLabel(String packageName) {
        try {
            android.content.pm.PackageManager pm = getPackageManager();
            android.content.pm.ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (Exception e) {
            return packageName;
        }
    }

    @Override
    public void onInterrupt() {
        // Do nothing
    }
}