package com.pornblocker;

import android.app.AlertDialog;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private TextView tvStatus;
    private TextView tvBlocked;
    private EditText etQuery;
    private SimpleBrowser browser;
    private BlocklistManager blocklist;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        blocklist = new BlocklistManager(this);
        tvStatus = findViewById(R.id.tvStatus);
        tvBlocked = findViewById(R.id.tvBlocked);
        etQuery = findViewById(R.id.etQuery);
        browser = (SimpleBrowser) getSupportFragmentManager().findFragmentById(R.id.browserFragment);

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

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void updateStatus() {
        String count = String.valueOf(blocklist.getHostCount());
        tvStatus.setText("Status: active");
        tvBlocked.setText("Blocked domains: " + count);
    }
}