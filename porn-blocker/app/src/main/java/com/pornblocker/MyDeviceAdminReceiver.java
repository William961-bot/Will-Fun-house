package com.pornblocker;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class MyDeviceAdminReceiver extends DeviceAdminReceiver {

    private static final String TAG = "MyDeviceAdminReceiver";

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        // Show warning when user tries to disable
        return "Disabling will remove porn blocking protection. " +
               "Please confirm you want to proceed.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        Log.d(TAG, "Device admin disabled - user removed protection");
        // Reset protection state
        super.onDisabled(context, intent);
    }

    @Override
    public void onEnabled(Context context, Intent intent) {
        Log.d(TAG, "Device admin enabled - protection active");
        super.onEnabled(context, intent);
    }
}