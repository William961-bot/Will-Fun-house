package com.pornblocker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.ByteBuffer;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class BlockerVpnService extends VpnService {

    private static final String TAG = "BlockerVpnService";
    public static final String ACTION_START = "com.pornblocker.ACTION_START";
    public static final String ACTION_STOP = "com.pornblocker.ACTION_STOP";
    public static final String ACTION_RELOAD = "com.pornblocker.ACTION_RELOAD";
    private static final String CHANNEL_ID = "PornBlockerChannel";
    private static final int NOTIFY_ID = 1001;

    public static volatile boolean isRunning = false;
    public static final AtomicInteger blockedCount = new AtomicInteger(0);

    private Thread worker;
    private volatile boolean vpnActive = false;
    private FileInputStream in;
    private FileOutputStream out;
    private ParcelFileDescriptor pfd;
    private final Set<String> blockedDomains = new HashSet<>();

    @Override
    public void onCreate() {
        super.onCreate();
        loadBlocklists();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopVpn();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_START.equals(action)) {
            startVpn();
            return START_STICKY;
        }
        if (ACTION_RELOAD.equals(action)) {
            reloadBlocklist();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void loadBlocklists() {
        reloadBlocklist();
    }

    private void reloadBlocklist() {
        try {
            Set<String> hosts = BlocklistManager.getAllBlockedHosts(this);
            synchronized (blockedDomains) {
                blockedDomains.clear();
                blockedDomains.addAll(hosts);
            }
        } catch (Throwable ignored) {}
    }

    public int getBlockedCount() {
        return blockedCount.get();
    }

    private void startVpn() {
        if (isRunning) return;
        try {
            VpnService.Builder builder = new VpnService.Builder();
            builder.setSession("PornBlockerVPN");
            builder.setMtu(1500);
            builder.addAddress("10.0.0.2", 32);
            builder.addRoute("0.0.0.0", 0);
            builder.addDnsServer("1.1.1.1");
            builder.addDnsServer("8.8.8.8");

            pfd = builder.establish();
            if (pfd == null) {
                Log.e(TAG, "VPN failed to establish");
                stopSelf();
                return;
            }

            in = new FileInputStream(pfd.getFileDescriptor());
            out = new FileOutputStream(pfd.getFileDescriptor());
            vpnActive = true;
            isRunning = true;
            blockedCount.set(0);

            startForeground(NOTIFY_ID, buildNotification());

            worker = new Thread(new Runnable() {
            @Override
            public void run() {
                runLoop();
            }
        }, "PornBlock");
            worker.start();

            Log.i(TAG, "VPN started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start VPN", e);
            stopSelf();
        }
    }

    private void stopVpn() {
        vpnActive = false;
        isRunning = false;
        blockedCount.set(0);
        if (worker != null) {
            worker.interrupt();
            worker = null;
        }
        try {
            if (in != null) { in.close(); in = null; }
            if (out != null) { out.close(); out = null; }
            if (pfd != null) { pfd.close(); pfd = null; }
        } catch (IOException ignored) {}
        stopForeground(true);
    }

    private void runLoop() {
        try {
            ByteBuffer packet = ByteBuffer.allocate(32767);
            while (vpnActive) {
                int length;
                try {
                    length = in.read(packet.array());
                } catch (IOException e) {
                    break;
                }
                if (length > 0) {
                    try {
                        handlePacket(packet, length);
                    } catch (Throwable t) {
                        // ignore bad packets, keep loop alive
                    }
                }
                packet.clear();
            }
        } catch (Throwable t) {
            Log.e(TAG, "VPN loop died", t);
        }
    }

    private void handlePacket(ByteBuffer packet, int length) {
        if (length < 20) return;
        byte version = (byte) ((packet.get(0) >> 4) & 0x0F);
        if (version != 4) return;

        // Read destination IP from bytes 16-19
        int dstIp = packet.getInt(16);
        byte[] dstBytes = new byte[4];
        dstBytes[0] = (byte) ((dstIp >>> 24) & 0xFF);
        dstBytes[1] = (byte) ((dstIp >>> 16) & 0xFF);
        dstBytes[2] = (byte) ((dstIp >>> 8) & 0xFF);
        dstBytes[3] = (byte) (dstIp & 0xFF);

        InetAddress dstAddr;
        try {
            dstAddr = InetAddress.getByAddress(dstBytes);
        } catch (Exception e) {
            return;
        }
        String dstStr = dstAddr.getHostAddress();

        byte protocol = packet.get(9);

        // DNS blocking via UDP port 53
        if (protocol == 17 && length >= 28) {
            int dstPort = ((packet.get(22) & 0xFF) << 8) | (packet.get(23) & 0xFF);
            if (dstPort == 53) {
                blockAndCount();
                return;
            }
        }

        // Check if destination IP is in blocklist
        Set<String> snapshot;
        synchronized (blockedDomains) { snapshot = new HashSet<>(blockedDomains); }
        if (snapshot.contains(dstStr)) {
            blockAndCount();
            return;
        }

        pass(packet, length);
    }

    private void blockAndCount() {
        blockedCount.incrementAndGet();
    }

    private void pass(ByteBuffer packet, int length) {
        try {
            out.write(packet.array(), 0, length);
        } catch (IOException ignored) {}
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Porn Blocker", NotificationManager.IMPORTANCE_LOW
            );
            ch.setDescription("Keeps the blocker VPN active");
            ch.setShowBadge(false);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Porn Blocker Active")
                .setContentText("System-wide blocking is running")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
    }
}