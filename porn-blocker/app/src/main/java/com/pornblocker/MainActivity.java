package com.pornblocker;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_VPN = 1001;
    private static final int REQUEST_POST = 1002;

    private TextView tvStatus;
    private TextView tvBlocked;
    private Button btnStart;
    private Button btnStop;
    private EditText etDomain;
    private EditText etQuery;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        tvStatus = findViewById(R.id.tvStatus);
        tvBlocked = findViewById(R.id.tvBlocked);
        btnStart = findViewById(R.id.btnStartVpn);
        btnStop = findViewById(R.id.btnStopVpn);
        etDomain = findViewById(R.id.etDomain);
        etQuery = findViewById(R.id.etQuery);

        btnStart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_POST);
                    return;
                }
                startVpn();
            }
        });

        btnStop.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, BlockerVpnService.class);
                intent.setAction(BlockerVpnService.ACTION_STOP);
                startService(intent);
                setActive(false);
            }
        });

        findViewById<Button>(R.id.btnAddDomain).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String raw = etDomain.getText().toString().trim();
                if (TextUtils.isEmpty(raw)) return;
                String domain = raw.toLowerCase().split("/")[0];
                BlocklistManager.addBlockedDomain(getApplicationContext(), domain);
                etDomain.setText("");
                Toast.makeText(MainActivity.this, "Blocked " + domain, Toast.LENGTH_SHORT).show();
                reloadBlocklist();
            }
        });

        findViewById<Button>(R.id.btnOpenBrowser).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String url = etQuery.getText().toString().trim();
                if (TextUtils.isEmpty(url)) {
                    new AlertDialog.Builder(MainActivity.this).setTitle("Error").setMessage("Enter a URL").show();
                    return;
                }
                String prefix = url.startsWith("http://") || url.startsWith("https://") ? url : "https://" + url;
                openBrowser(prefix);
            }
        });

        setActive(BlockerVpnService.isRunning);
        updateBlockedCount();
    }

    @Override
    protected void onResume() {
        super.onResume();
        setActive(BlockerVpnService.isRunning);
        updateBlockedCount();
    }

    private void setActive(boolean active) {
        btnStart.setEnabled(!active);
        btnStop.setEnabled(active);
        tvStatus.setText(active ? "Status: active" : "Status: inactive");
    }

    private void updateBlockedCount() {
        int count = BlockerVpnService.blockedCount.get();
        tvBlocked.setText("Blocked requests: " + count);
    }

    private void startVpn() {
        Intent intent = VpnService.prepare(this);
        if (intent != null) {
            startActivityForResult(intent, REQUEST_VPN);
        } else {
            activateVpn();
        }
    }

    private void activateVpn() {
        Intent intent = new Intent(this, BlockerVpnService.class);
        intent.setAction(BlockerVpnService.ACTION_START);
        startService(intent);
        setActive(true);
    }

    private void reloadBlocklist() {
        try {
            Intent intent = new Intent(this, BlockerVpnService.class);
            intent.setAction(BlockerVpnService.ACTION_RELOAD);
            startService(intent);
        } catch (Exception e) { e.printStackTrace(); }
    }

    private void openBrowser(String url) {
        Toast.makeText(this, "Opening: " + url, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_POST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startVpn();
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_VPN && resultCode == RESULT_OK) {
            activateVpn();
        }
    }
}