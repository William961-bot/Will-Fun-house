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
import androidx.core.app.NotificationCompat;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.DatagramChannel;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import com.pornblocker.MainActivity;

public class BlockerVpnService extends VpnService {

    public static final String ACTION_START = "com.pornblocker.ACTION_START";
    public static final String ACTION_STOP = "com.pornblocker.ACTION_STOP";

    public static final String TAG = "PornBlockerVPN";
    public static final String CHANNEL_ID = "porn-blocker-channel";
    public static final int NOTIF_ID = 1;

    public static final AtomicBoolean isRunning = new AtomicBoolean(false);
    public static final AtomicInteger blockedCount = new AtomicInteger(0);

    private static Thread vpnThread;
    private static ParcelFileDescriptor vpnInterface;

    private BlocklistManager blocklist;

    @Override
    public void onCreate() {
        super.onCreate();
        this.blocklist = new BlocklistManager(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_START.equals(action)) {
            startVpn();
        } else if (ACTION_STOP.equals(action)) {
            stopVpn();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel chan = new NotificationChannel(
                CHANNEL_ID,
                "Protection",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager mgr = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            mgr.createNotificationChannel(chan);
        }
    }

    private Notification buildNotification() {
        Intent activityIntent = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
            this, 0, activityIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Protection enabled")
            .setContentText("Blocking unwanted domains")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setContentIntent(pending)
            .build();
    }

    private void startVpn() {
        if (isRunning.get()) return;
        try {
            vpnInterface = buildVpnInterface();
            isRunning.set(true);
            startForeground(NOTIF_ID, buildNotification());
            vpnThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        runVpnLoop();
                    } catch (Exception e) {
                        Log.w(TAG, "VPN loop stopped", e);
                    } finally {
                        cleanup();
                    }
                }
            });
            vpnThread.start();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start VPN", e);
        }
    }

    private void stopVpn() {
        cleanup();
        stopForeground(true);
        stopSelf();
    }

    private void cleanup() {
        try { if (vpnInterface != null) vpnInterface.close(); } catch (Exception ignored) {}
        vpnInterface = null;
        isRunning.set(false);
        vpnThread = null;
    }

    private ParcelFileDescriptor buildVpnInterface() {
        VpnService.Builder builder = new VpnService.Builder();
        builder.setSession("PornBlocker");
        builder.addAddress("10.0.0.2", 32);
        builder.addDnsServer("1.1.1.1");
        builder.addRoute("0.0.0.0", 0);
        builder.addRoute("::", 0);
        builder.setBlocking(true);
        return builder.establish();
    }

    private void runVpnLoop() {
        try {
            FileInputStream vpnInput = new FileInputStream(vpnInterface.getFileDescriptor());
            FileOutputStream vpnOutput = new FileOutputStream(vpnInterface.getFileDescriptor());
            byte[] packetBytes = new byte[32767];
            ByteBuffer packet = ByteBuffer.wrap(packetBytes);

            while (isRunning.get()) {
                try {
                    packet.clear();
                    int length = vpnInput.read(packet.array());
                    if (length <= 0) continue;
                    packet.limit(length);

                    byte versionByte = packet.get(0);
                    int version = (versionByte & 0xFF) >> 4;
                    if (version != 4) continue;
                    if (length <= 20) continue;

                    int protocol = packet.get(9) & 0xFF;
                    if (protocol != 6 && protocol != 17) continue;

                    String dstIp = String.format(
                        "%d.%d.%d.%d",
                        packet.get(16) & 0xFF,
                        packet.get(17) & 0xFF,
                        packet.get(18) & 0xFF,
                        packet.get(19) & 0xFF
                    );

                    int headerOffset = 20;
                    int srcPort = ((packet.get(headerOffset) & 0xFF) << 8) | (packet.get(headerOffset + 1) & 0xFF);
                    int dstPort = ((packet.get(headerOffset + 2) & 0xFF) << 8) | (packet.get(headerOffset + 3) & 0xFF);

                    if (blocklist.isBlocked(dstIp) || blocklist.isBlockedPort(dstPort)) {
                        blockedCount.incrementAndGet();
                        sendTcpReset(vpnOutput, packetBytes, length, srcPort, dstPort, dstIp);
                    } else if (protocol == 17) {
                        forwardUdp(vpnInput, vpnOutput, packetBytes, length, dstIp, dstPort);
                    } else {
                        vpnOutput.write(packetBytes, 0, length);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Packet error", e);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "VPN stream failed", e);
        }
    }

    private void sendTcpReset(FileOutputStream outStream, byte[] original, int length, int srcPort, int dstPort, String dstIp) {
        try {
            byte[] response = new byte[40];
            response[0] = (byte) 0x45;
            response[1] = 0;
            response[2] = 0;
            response[3] = 0;
            response[4] = 0;
            response[5] = 0x40;
            response[6] = 0;
            response[7] = 0;
            response[8] = 0;
            response[9] = 0x06;
            response[10] = 0;
            response[11] = 0;
            response[12] = 0;
            response[13] = 0;
            response[14] = 0;
            response[15] = 0;
            for (int i = 16; i < 20; i++) response[i] = original[i];
            response[20] = (byte) ((srcPort >> 8) & 0xFF);
            response[21] = (byte) (srcPort & 0xFF);
            response[22] = (byte) ((dstPort >> 8) & 0xFF);
            response[23] = (byte) (dstPort & 0xFF);
            response[24] = 0;
            response[25] = 0;
            response[26] = 0x50;
            response[27] = 0x04;
            response[28] = 0;
            response[29] = 0;
            response[30] = 0;
            response[31] = 0;
            response[32] = 0;
            response[33] = 0;
            response[34] = 0;
            response[35] = 0;
            response[36] = 0;
            response[37] = 0;
            response[38] = 0;
            response[39] = 0;

            int sum = 0;
            for (int i = 0; i < 20; i += 2) {
                sum += ((response[i] & 0xFF) << 8) | (response[i + 1] & 0xFF);
            }
            int checksum = (sum >> 16) + (sum & 0xFFFF);
            response[24] = (byte) ((checksum >> 8) & 0xFF);
            response[25] = (byte) (checksum & 0xFF);

            outStream.write(response);
        } catch (Exception e) {
            Log.w(TAG, "TCP reset failed for " + dstIp + ":" + dstPort, e);
        }
    }

    private void forwardUdp(FileInputStream input, FileOutputStream output, byte[] packetBytes, int length, String dstIp, int dstPort) {
        try {
            DatagramChannel socketChannel = DatagramChannel.open();
            socketChannel.socket().connect(new InetSocketAddress(dstIp, dstPort));

            int headerOffset = 20;
            int payloadSize = length - headerOffset - 8;
            if (payloadSize > 0) {
                byte[] payload = new byte[payloadSize];
                System.arraycopy(packetBytes, headerOffset + 8, payload, 0, payloadSize);
                socketChannel.send(ByteBuffer.wrap(payload), new InetSocketAddress(dstIp, dstPort));
            }

            ByteBuffer reply = ByteBuffer.allocate(32767);
            socketChannel.receive(reply);
            socketChannel.close();

            if (reply.position() > 0) {
                output.write(packetBytes, 0, length);
            }
        } catch (Exception ignored) {
            // drop blocked or failed UDP traffic silently
        }
    }
}