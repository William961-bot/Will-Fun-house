package com.pornblocker

import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.tabs.TabLayoutMediator
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout

class MainActivity : AppCompatActivity() {

    private val REQUEST_POST = 1002
    private val REQUEST_DEVICE_ADMIN = 1003

    private lateinit var viewPager: ViewPager2
    private lateinit var tabLayout: TabLayout
    private lateinit var adapter: ViewPagerAdapter

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
        // Enable Accessibility Service
        enableAccessibilityService()
    }

    private fun enableAccessibilityService() {
        val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(this, "Please enable 'Porn Blocker' Accessibility Service in Settings → Accessibility", 
            Toast.LENGTH_LONG).show()
    }

    private fun showBlockingHelp() {
        val message = """
            |How BlockerHero Style Blocking Works:
            |
            |★ APP BLOCKING (Main Protection)
            |  1. Enable Device Admin (prevents uninstall)
            |  2. Enable Accessibility Service
            |  3. Blocked apps will show warning screen
            |
            |★ Blocked Apps (Default)
            |  • Chrome (blocks entire browser)
            |  • Brave Browser
            |  • PornHub app
            |  • XVideos app
            |  • XNXX app
            |  • RedTube app
            |  • YouPorn app
            |  • Any app with "porn", "adult", "nude", "sex" in name
            |
            |★ How it works
            |  When you try to open a blocked app,
            |  a warning screen appears instead.
            |
            |★ To add/remove blocked apps
            |  Go to Blocklist tab in the app.
        """.trimMargin()
        
        AlertDialog.Builder(this)
            .setTitle("Blocking Help")
            .setMessage(message)
            .setPositiveButton("Got it") { d, _ -> d.dismiss() }
            .show()
    }
}