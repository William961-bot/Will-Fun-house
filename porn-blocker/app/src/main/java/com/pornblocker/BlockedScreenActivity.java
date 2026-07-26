package com.pornblocker;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class BlockedScreenActivity extends AppCompatActivity {

    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_BLOCKED_APPS = "blocked_apps";

    private TextView tvAppName;
    private Button btnUnblock;
    private Button btnBack;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_blocked_screen);

        tvAppName = findViewById(R.id.tvAppName);
        btnUnblock = findViewById(R.id.btnUnblock);
        btnBack = findViewById(R.id.btnBack);

        String appName = getIntent().getStringExtra("app_name");
        if (appName != null) {
            tvAppName.setText(appName + " has been blocked");
        }

        btnUnblock.setOnClickListener(v -> {
            // Remove from blocklist
            java.util.Set<String> blocked = getSharedPreferences(PREFS, MODE_PRIVATE)
                    .getStringSet(KEY_BLOCKED_APPS, new java.util.HashSet<>());
            blocked.remove(getIntent().getStringExtra("package_name"));
            getSharedPreferences(PREFS, MODE_PRIVATE)
                    .edit()
                    .putStringSet(KEY_BLOCKED_APPS, blocked)
                    .apply();
            finish();
        });

        btnBack.setOnClickListener(v -> finish());
    }
}