package com.pornblocker

import android.app.AlertDialog
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

    private lateinit var viewPager: ViewPager2
    private lateinit var tabLayout: TabLayout
    private lateinit var adapter: ViewPagerAdapter
    private var vpnLauncher: androidx.activity.result.ActivityResultLauncher<Intent>? = null

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

        setupPermissions()
        
        // Add help button
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
        Toast.makeText(this, "VPN started", Toast.LENGTH_SHORT).show()
    }

    fun isVpnRunning(): Boolean {
        return BlockerVpnService.isRunning
    }

    fun getBlockedCount(): Int {
        return BlockerVpnService.blockedCount.get()
    }
    
    private fun showBlockingHelp() {
        val message = """
            |For BEST blocking results, use one of these methods:
            |
            |1. ROUTER DNS (Most Permanent)
            |   Login to your router's admin page (usually 192.168.1.1)
            |   Find DNS settings and enter:
            |   Primary: 185.228.168.9 (CleanBrowsing Family)
            |   or: 94.140.14.14 (AdGuard Family)
            |   This blocks ALL devices on your network
            |
            |2. PRIVATE DNS (System-wide)
            |   Settings → Network & Internet → Private DNS
            |   Enter: dns.cleanbrowsing.org
            |   or: family-filter.dns.adguard.com
            |
            |3. CHROME SETTINGS
            |   Open Chrome → chrome://settings/security
            |   Enable "Enhanced protection"
            |
            |4. BUILT-IN BROWSER
            |   Use the app's "Browser" tab
            |   Blocks within the app's WebView
            |
            |VPN method: Works for apps using system DNS.
            |Chrome uses DNS-over-HTTPS which bypasses VPN DNS.
        """.trimMargin()
        
        AlertDialog.Builder(this)
            .setTitle("Blocking Help - Most Effective First")
            .setMessage(message)
            .setPositiveButton("Got it") { d, _ -> d.dismiss() }
            .show()
    }
}