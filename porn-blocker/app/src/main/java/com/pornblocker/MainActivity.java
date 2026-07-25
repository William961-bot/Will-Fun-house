package com.pornblocker;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private TextView tvStatus;
    private TextView tvBlocked;
    private Button btnStart;
    private Button btnStop;
    private EditText etQuery;
    private SimpleBrowser browser;

    private final ActivityResultLauncher<Intent> vpnLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        new androidx.activity.result.ActivityResultCallback<androidx.activity.result.ActivityResult>() {
            @Override
            public void onActivityResult(androidx.activity.result.ActivityResult result) {
                if (result.getResultCode() == RESULT_OK) {
                    startVpn();
                }
            }
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        tvStatus = findViewById(R.id.tvStatus);
        tvBlocked = findViewById(R.id.tvBlocked);
        btnStart = findViewById(R.id.btnStartVpn);
        btnStop = findViewById(R.id.btnStopVpn);
        etQuery = findViewById(R.id.etQuery);
        browser = (SimpleBrowser) getSupportFragmentManager().findFragmentById(R.id.browserFragment);

        btnStart.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View v) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 100);
                        return;
                    }
                }
                startVpn();
            }
        });

        btnStop.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View v) {
                BlockerVpnService.isRunning.set(false);
                stopService(new Intent(MainActivity.this, BlockerVpnService.class));
                tvStatus.setText("Status: inactive");
                btnStart.setEnabled(true);
                btnStop.setEnabled(false);
            }
        });

        Button btnOpenBrowser = findViewById(R.id.btnOpenBrowser);
        btnOpenBrowser.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View v) {
                String url = etQuery.getText().toString().trim();
                if (TextUtils.isEmpty(url)) {
                    new AlertDialog.Builder(MainActivity.this).setTitle("Error").setMessage("Enter a URL").show();
                    return;
                }
                String prefix = url.startsWith("http://") || url.startsWith("https://") ? url : "https://" + url;
                if (browser != null) browser.load(prefix);
            }
        });

        updateStatus();
    }

    private void startVpn() {
        Intent intent = VpnService.prepare(this);
        if (intent != null) {
            vpnLauncher.launch(intent);
        } else {
            runVpn();
        }
    }

    private void runVpn() {
        Intent intent = new Intent(this, BlockerVpnService.class);
        intent.setAction(BlockerVpnService.ACTION_START);
        startService(intent);
        tvStatus.setText("Status: active");
        btnStart.setEnabled(false);
        btnStop.setEnabled(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void updateStatus() {
        boolean running = BlockerVpnService.isRunning.get();
        tvStatus.setText(running ? "Status: active" : "Status: inactive");
        btnStart.setEnabled(!running);
        btnStop.setEnabled(running);
        tvBlocked.setText("Blocked: " + BlockerVpnService.blockedCount.get());
    }
}