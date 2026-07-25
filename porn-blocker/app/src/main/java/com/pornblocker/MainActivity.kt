package com.pornblocker

import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.VpnService
import android.os.Bundle
import android.text.TextUtils
import android.webkit.WebView
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment

class MainActivity : AppCompatActivity() {

    private val REQUEST_VPN = 1001
    private val REQUEST_POST = 1002

    private lateinit var tvStatus: TextView
    private lateinit var tvBlocked: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private lateinit var browser: SimpleBrowser

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvBlocked = findViewById(R.id.tvBlocked)
        btnStart = findViewById(R.id.btnStartVpn)
        btnStop = findViewById(R.id.btnStopVpn)
        browser = findViewById(R.id.browserFragment)

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.browserFragment, SimpleBrowser.newInstance())
                .commitNow()
        }

        btnStart.setOnClickListener {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
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
            val intent = Intent(this, BlockerVpnService::class.java).apply { action = BlockerVpnService.ACTION_STOP }
            startService(intent)
            setActive(false)
            tvStatus.text = "Status: inactive"
        }

        findViewById<Button>(R.id.btnOpenBrowser).setOnClickListener {
            val url = findViewById<EditText>(R.id.etQuery).text.toString().trim()
            if (TextUtils.isEmpty(url)) return@setOnClickListener

            val prefix = if (!url.startsWith("http://") && !url.startsWith("https://")) "https://$url" else url
            (supportFragmentManager.findFragmentById(R.id.browserFragment) as? SimpleBrowser)?.load(prefix) ?: run {
                AlertDialog.Builder(this).setTitle("Browser not ready").setMessage("Try again").show()
            }
        }

        setActive(BlockerVpnService.isRunning)
        updateBlockedCount()
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
        val intent = Intent(this, BlockerVpnService::class.java).apply { action = BlockerVpnService.ACTION_START }
        startService(intent)
        setActive(true)
        tvStatus.text = "Status: active"
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_VPN && resultCode == RESULT_OK) activateVpn()
    }

    fun setActive(active: Boolean) {
        btnStart.isEnabled = !active
        btnStop.isEnabled = active
        tvStatus.text = if (active) "Status: active" else "Status: inactive"
    }

    fun updateBlockedCount() {
        val count = BlockerVpnService.blockedCount
        tvBlocked.text = "Blocked: $count"
    }

    override fun onResume() {
        super.onResume()
        setActive(BlockerVpnService.isRunning)
        updateBlockedCount()
    }
}
