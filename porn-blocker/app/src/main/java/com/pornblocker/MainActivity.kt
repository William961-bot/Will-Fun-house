package com.pornblocker

import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.VpnService
import android.os.Bundle
import android.text.TextUtils
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat

class MainActivity : AppCompatActivity() {

    private val REQUEST_VPN = 1001
    private val REQUEST_POST = 1002

    private lateinit var tvStatus: TextView
    private lateinit var tvBlocked: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private lateinit var etDomain: EditText
    private lateinit var browser: com.pornblocker.SimpleBrowser

    private val refreshIntervalMs = 1000L
    private var refreshJob: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvBlocked = findViewById(R.id.tvBlocked)
        btnStart = findViewById(R.id.btnStartVpn)
        btnStop = findViewById(R.id.btnStopVpn)
        etDomain = findViewById(R.id.etDomain)

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.browserFragment, com.pornblocker.SimpleBrowser.newInstance())
                .commitNow()
        }
        browser = supportFragmentManager.findFragmentById(R.id.browserFragment) as com.pornblocker.SimpleBrowser

        btnStart.setOnClickListener {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
                checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    REQUEST_POST
                )
                return@setOnClickListener
            }
            startVpn()
        }

        btnStop.setOnClickListener {
            val intent = Intent(this, com.pornblocker.BlockerVpnService::class.java).apply {
                action = com.pornblocker.BlockerVpnService.ACTION_STOP
            }
            startService(intent)
            setActive(false)
        }

        findViewById<Button>(R.id.btnAddDomain).setOnClickListener {
            val raw = etDomain.text.toString().trim()
            if (TextUtils.isEmpty(raw)) return@setOnClickListener
            val domain = raw.lowercase().replaceFirst("https://", "").replaceFirst("http://", "").split("/")[0]
            if (domain.isBlank()) return@setOnClickListener
            BlocklistManager.addBlockedDomain(applicationContext, domain)
            etDomain.text?.clear()
            reloadVpnBlocklist()
            Toast.makeText(this, "Blocked $domain", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.btnOpenBrowser).setOnClickListener {
            val url = findViewById<EditText>(R.id.etQuery).text.toString().trim()
            if (TextUtils.isEmpty(url)) return@setOnClickListener
            val prefix = if (!url.startsWith("http://") && !url.startsWith("https://")) "https://$url" else url
            browser.load(prefix)
        }

        setActive(com.pornblocker.BlockerVpnService.isRunning)
        refreshCount()
    }

    override fun onResume() {
        super.onResume()
        setActive(com.pornblocker.BlockerVpnService.isRunning)
        refreshCount()
    }

    override fun onDestroy() {
        super.onDestroy()
        refreshJob = null
    }

    private fun setActive(active: Boolean) {
        btnStart.isEnabled = !active
        btnStop.isEnabled = active
        tvStatus.text = if (active) "Status: active" else "Status: inactive"
    }

    private fun refreshCount() {
        val count = com.pornblocker.BlockerVpnService.blockedCount.get()
        tvBlocked.text = "Blocked requests: $count"
    }

    private fun startVpn() {
        val intent = VpnService.prepare(this)
        if (intent != null) {
            startActivityForResult(intent, REQUEST_VPN)
        } else {
            activateVpn()
        }
    }

    private fun activateVpn() {
        val intent = Intent(this, com.pornblocker.BlockerVpnService::class.java).apply {
            action = com.pornblocker.BlockerVpnService.ACTION_START
        }
        startService(intent)
        setActive(true)
        startRefreshLoop()
    }

    private fun startRefreshLoop() {
        val job = object : Runnable {
            override fun run() {
                if (!com.pornblocker.BlockerVpnService.isRunning) {
                    refreshJob = null
                    return
                }
                refreshCount()
                tvStatus.postDelayed(this, refreshIntervalMs)
            }
        }
        refreshJob = job
        tvStatus.post(job)
    }

    private fun reloadVpnBlocklist() {
        try {
            val intent = Intent(this, com.pornblocker.BlockerVpnService::class.java).apply {
                action = com.pornblocker.BlockerVpnService.ACTION_RELOAD
            }
            startService(intent)
        } catch (e: Exception) { e.printStackTrace() }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_VPN && resultCode == RESULT_OK) {
            activateVpn()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_POST && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startVpn()
        }
    }
}
