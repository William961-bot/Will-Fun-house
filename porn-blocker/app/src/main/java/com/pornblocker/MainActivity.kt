package com.pornblocker

import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.text.TextUtils
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.tabs.TabLayoutMediator
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout

class MainActivity : AppCompatActivity() {

    private val REQUEST_VPN = 1001
    private val REQUEST_POST = 1002
    private val REQUEST_DEVICE_ADMIN = 1003

    private lateinit var viewPager: ViewPager2
    private lateinit var tabLayout: TabLayout
    private lateinit var adapter: ViewPagerAdapter
    private var vpnLauncher: androidx.activity.result.ActivityResultLauncher<Intent>? = null

    // Device Admin
    private lateinit var deviceAdminReceiver: ComponentName
    private var devicePolicyManager: DevicePolicyManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        viewPager = findViewById(R.id.viewPager)
        tabLayout = findViewById(R.id.tabLayout)

        adapter = ViewPagerAdapter(this)
        viewPager.adapter = adapter

        TabLayoutMediator(tabLayout, viewPager) { tab, position ->
            val titles = listOf("Home", "Blocklist", "Activity", "Profile")
            if (position < titles.size) {
                tab.setText(titles[position])
            }
        }.attach()

        vpnLauncher = registerForActivityResult(
            androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == RESULT_OK) {
                activateVpn()
            }
        }

        // Setup Device Admin
        deviceAdminReceiver = ComponentName(this, MyDeviceAdminReceiver::class.java)
        devicePolicyManager = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager?

        setupPermissions()
        checkDeviceAdmin()
        
        findViewById<Button>(R.id.btnHelp)?.setOnClickListener {
            showBlockingHelp()
        }
    }

    private fun setupPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_POST
                )
            }
        }
    }

    private fun checkDeviceAdmin() {
        if (!isDeviceAdminActive()) {
            AlertDialog.Builder(this)
                .setTitle("Enable Protection")
                .setMessage("Enable Device Admin to prevent easy uninstall of the blocker.")
                .setPositiveButton("Enable") { _, _ ->
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                    intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, deviceAdminReceiver)
                    intent.putExtra(DevicePolicyManager.EXTRA_ADD_ADMIN_ACCOUNT, null)
                    startActivityForResult(intent, REQUEST_DEVICE_ADMIN)
                }
                .setNegativeButton("Skip") { d, _ -> d.dismiss() }
                .show()
        }
    }

    private fun isDeviceAdminActive(): Boolean {
        return devicePolicyManager?.isAdminActive(deviceAdminReceiver) ?: false
    }

    fun startProtection() {
        // Start VPN
        startVpn()
        
        // Enable Accessibility Service
        enableAccessibilityService()
    }

    private fun enableAccessibilityService() {
        val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(this, "Please enable 'Porn Blocker' Accessibility Service in Settings → Accessibility", 
            Toast.LENGTH_LONG).show()
    }

    fun startVpn() {
        val intent = VpnService.prepare(this)
        if (intent != null) {
            vpnLauncher?.launch(intent)
        } else {
            activateVpn()
        }
    }

    fun stopVpn() {
        val intent = Intent(this, BlockerVpnService::class.java)
        intent.action = BlockerVpnService.ACTION_STOP
        startService(intent)
        Toast.makeText(this, "VPN stopped", Toast.LENGTH_SHORT).show()
    }

    private fun activateVpn() {
        if (BlockerVpnService.isRunning) {
            Toast.makeText(this, "VPN already active", Toast.LENGTH_SHORT).show()
            return
        }
        
        val intent = Intent(this, BlockerVpnService::class.java)
        intent.action = BlockerVpnService.ACTION_START
        startService(intent)
        Toast.makeText(this, "VPN started - tap OK in system dialog", Toast.LENGTH_LONG).show()
    }

    fun isVpnRunning(): Boolean {
        return BlockerVpnService.isRunning
    }

    fun getBlockedCount(): Int {
        return BlockerVpnService.blockedCount.get()
    }
    
    private fun showBlockingHelp() {
        val message = """
            |For BEST blocking results, use ONE of these methods:
            |
            |★ ROUTER DNS (MOST PERMANENT - Recommended)
            |  This blocks on ALL devices automatically
            |  1. Login to your router (usually 192.168.1.1)
            |  2. Find DNS settings (Advanced → Internet)
            |  3. Set PRIMARY DNS: 185.228.168.9
            |  4. Save and reboot router
            |
            |★ PRIVATE DNS (System-wide)
            |  Settings → Network & Internet → Private DNS
            |  Enter: dns.cleanbrowsing.org
            |  or: family-filter.dns.adguard.com
            |
            |★ APP METHOD (Requires setup)
            |  1. Enable Device Admin (prevents uninstall)
            |  2. Enable Accessibility Service
            |  3. Tap "Start Protection"
            |  4. Tap "OK" in VPN permission dialog
            |
            |Note: Chrome uses DNS-over-HTTPS which may bypass VPN DNS.
            |Router DNS blocks ALL apps including Chrome.
        """.trimMargin()
        
        AlertDialog.Builder(this)
            .setTitle("Blocking Help - Most Effective First")
            .setMessage(message)
            .setPositiveButton("Got it") { d, _ -> d.dismiss() }
            .show()
    }
}