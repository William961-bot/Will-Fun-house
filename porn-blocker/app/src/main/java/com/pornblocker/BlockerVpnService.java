package com.pornblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class BlockerVpnService : Service() {

    companion object {
        const val ACTION_START = "com.pornblocker.ACTION_START"
        const val ACTION_STOP = "com.pornblocker.ACTION_STOP"

        const val TAG = "PornBlockerVPN"
        const val CHANNEL_ID = "porn-blocker-channel"
        const val NOTIF_ID = 1

        val isRunning = AtomicBoolean(false)
        val blockedCount = AtomicInteger(0)

        private var vpnThread: Thread? = null
        private var vpnInterface: ParcelFileDescriptor? = null
    }

    private val blocklist by lazy { BlocklistManager(this) }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startVpn()
            ACTION_STOP -> stopVpn()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?) = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID,
                "Protection",
                NotificationManager.IMPORTANCE_LOW
            )
            val mgr = getSystemService(NotificationManager::class.java)
            mgr.createNotificationChannel(chan)
        }
    }

    private fun buildNotification(): Notification {
        val activityIntent = Intent(this, MainActivity::class.java)
        val pending = PendingIntent.getActivity(
            this, 0, activityIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Protection enabled")
            .setContentText("Blocking unwanted domains")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setContentIntent(pending)
            .build()
    }

    private fun startVpn() {
        if (isRunning.get()) return

        try {
            vpnInterface = buildVpnInterface()
            isRunning.set(true)
            startForeground(NOTIF_ID, buildNotification())

            vpnThread = Thread {
                try {
                    runVpnLoop()
                } catch (e: Exception) {
                    Log.w(TAG, "VPN loop stopped", e)
                } finally {
                    cleanup()
                }
            }
            vpnThread?.start()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
        }
    }

    private fun stopVpn() {
        cleanup()
        stopForeground(true)
        stopSelf()
    }

    private fun cleanup() {
        try { vpnInterface?.close() } catch (ignored: Exception) {}
        vpnInterface = null
        isRunning.set(false)
        vpnThread = null
    }

    private fun buildVpnInterface(): ParcelFileDescriptor {
        val builder = VpnService.Builder().apply {
            setSession("PornBlocker")
            addAddress("10.0.0.2", 32)
            addDnsServer("1.1.1.1")
            addRoute("0.0.0.0", 0)
            addRoute("::", 0)
            setBlocking(true)
        }
        return builder.establish()
    }

    private fun runVpnLoop() {
        val vpnInput = FileInputStream(vpnInterface?.fileDescriptor)
        val vpnOutput = FileOutputStream(vpnInterface?.fileDescriptor)
        val packet = ByteBuffer.allocate(32767)

        while (isRunning.get()) {
            try {
                packet.clear()
                val length = vpnInput.read(packet.array())
                if (length <= 0) continue
                packet.limit(length)

                val version = packet.get(0).toInt() ushr 4
                if (version != 4) continue

                if (length <= 20) continue
                val protocol = packet.get(9).toInt() and 0xFF
                if (protocol != 6 && protocol != 17) continue

                val dstIp = String.format(
                    "%d.%d.%d.%d",
                    packet.get(16).toInt() and 0xFF,
                    packet.get(17).toInt() and 0xFF,
                    packet.get(18).toInt() and 0xFF,
                    packet.get(19).toInt() and 0xFF
                )

                val srcPort = ((packet.get(offset(version)) .toInt() and 0xFF) shl 8) or (packet.get(offset(version) + 1).toInt() and 0xFF)
                val dstPort = ((packet.get(offset(version) + 2).toInt() and 0xFF) shl 8) or (packet.get(offset(version) + 3).toInt() and 0xFF)

                if (blocklist.isBlocked(dstIp) || blocklist.isBlockedPort(dstPort)) {
                    blockedCount.incrementAndGet()
                    sendTcpReset(vpnInput, vpnOutput, packet, length, srcPort, dstPort, dstIp, protocol)
                } else if (protocol == 17) {
                    forwardUdp(vpnInput, vpnOutput, packet, length, dstIp, dstPort)
                } else {
                    packet.position(0)
                    packet.limit(length)
                    vpnOutput.write(packet.array(), 0, packet.remaining())
                }
            } catch (e: Exception) {
                Log.w(TAG, "Packet error", e)
            }
        }
    }

    private fun offset(version: Int): Int = if (version == 4) 20 else 40

    private fun sendTcpReset(
        inStream: FileInputStream,
        outStream: FileOutputStream,
        packet: ByteBuffer,
        length: Int,
        srcPort: Int,
        dstPort: Int,
        dstIp: String,
        protocol: Int
    ) {
        try {
            val response = ByteBuffer.allocate(40)
            response.put((4 shl 4 or 5).toByte())
            response.put(0.toByte())
            response.put(0.toByte())
            response.put(0.toByte())
            response.put(0.toByte())
            response.put(0x40.toByte())
            response.put(0.toByte())
            response.put(0.toByte())
            response.put(0.toByte())
            response.put(0xFF.toByte())
            response.put(CALC.tcp.toByte())
            response.putShort(0)
            response.putInt(0)
            for (i in 20..25) response.put(packet[i])
            response.putShort((srcPort and 0xFFFF).toShort())
            response.putShort((dstPort and 0xFFFF).toShort())
            response.putInt(0)
            response.put(0x50.toByte())
            response.put(0x04.toByte())
            response.putShort(0)
            response.putInt(0)
            response.putInt(0)

            response.position(10)
            var sum = 0
            for (i in 0 until 10) {
                sum += ((response[i].toInt() and 0xFF) shl 8) or (response[i + 10].toInt() and 0xFF)
            }
            val checksum = (sum ushr 16) + (sum and 0xFFFF)
            response.putShort(20, (checksum and 0xFFFF).toShort())

            response.position(0)
            outStream.write(response.array(), 0, response.remaining())
        } catch (e: Exception) {
            Log.w(TAG, "TCP reset failed for $dstIp:$dstPort", e)
        }
    }

    private fun forwardUdp(
        input: FileInputStream,
        output: FileOutputStream,
        packet: ByteBuffer,
        length: Int,
        dstIp: String,
        dstPort: Int
    ) {
        try {
            val socketChannel = DatagramChannel.open()
            socketChannel.socket().connect(InetSocketAddress(dstIp, dstPort))

            val payloadSize = length - offset(4) - 8
            if (payloadSize > 0) {
                val payload = ByteArray(payloadSize)
                System.arraycopy(packet.array(), offset(4) + 8, payload, 0, payloadSize)
                socketChannel.send(ByteBuffer.wrap(payload), InetSocketAddress(dstIp, dstPort))
            }

            val reply = ByteArray(32767)
            val buffer = ByteBuffer.wrap(reply)
            socketChannel.receive(buffer)
            socketChannel.close()

            if (buffer.position() > 0) {
                packet.position(0)
                packet.limit(length)
                output.write(packet.array(), 0, packet.remaining())
            }
        } catch (ignored: Exception) {
            // drop blocked or failed UDP traffic silently
        }
    }

    private object CALC {
        const val tcp: Short = 6
        const val udp: Short = 17
    }
}
