package com.pornblocker;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
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
        Log.d(TAG, "Accessibility service connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        String packageName = event.getPackageName() != null ? event.getPackageName().toString() : null;
        if (packageName == null) return;

        // Check if this app is blocked
        if (isAppBlocked(packageName)) {
            Log.d(TAG, "Blocking app: " + packageName);
            
            // Show blocked screen
            Intent intent = new Intent(this, BlockedScreenActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
            intent.putExtra("package_name", packageName);
            intent.putExtra("app_name", getAppLabel(packageName));
            startActivity(intent);
        }
    }

    private boolean isAppBlocked(String packageName) {
        // Porn-specific apps only - browsers stay open
        Set<String> defaultBlocked = new HashSet<>();
        defaultBlocked.add("com.pornhub");
        defaultBlocked.add("com.xvideos");
        defaultBlocked.add("com.xnxx");
        defaultBlocked.add("com.redtube");
        defaultBlocked.add("com.youporn");
        defaultBlocked.add("com.tube");
        defaultBlocked.add("com.incel");
        defaultBlocked.add("com.nude");
        defaultBlocked.add("com.sex");
        defaultBlocked.add("com.adult");
        
        android.content.SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> blockedApps = prefs.getStringSet(KEY_BLOCKED_APPS, defaultBlocked);
        return blockedApps != null && blockedApps.contains(packageName);
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
    public void onInterrupt() {}
}