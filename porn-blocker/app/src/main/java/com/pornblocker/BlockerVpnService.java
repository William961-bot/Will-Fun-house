package com.pornblocker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * Stub service - VPN feature removed.
 * Use BlocklistManager for domain filtering in the app browser only.
 */
public class BlockerVpnService extends Service {

    public static final String ACTION_START = "com.pornblocker.ACTION_START";
    public static final String ACTION_STOP = "com.pornblocker.ACTION_STOP";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}