package com.pornblocker;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.VpnService;
import android.os.Bundle;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.viewpager2.widget.ViewPager2;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_POST = 1002;
    private ViewPager2 viewPager;
    private TabLayout tabLayout;
    private ViewPagerAdapter adapter;
    private ActivityResultLauncher<Intent> vpnLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        viewPager = findViewById(R.id.viewPager);
        tabLayout = findViewById(R.id.tabLayout);

        adapter = new ViewPagerAdapter(this);
        viewPager.setAdapter(adapter);

        new TabLayoutMediator(tabLayout, viewPager, (tab, position) -> {
            if (position == 0) {
                tab.setText("Home");
            } else if (position == 1) {
                tab.setText("Blocklist");
            } else if (position == 2) {
                tab.setText("Activity");
            } else if (position == 3) {
                tab.setText("Profile");
            }
        }).attach();

        vpnLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK) {
                    activateVpn();
                }
            }
        );

        setupPermissions();
    }

    public ViewPager2 getViewPager2() {
        return viewPager;
    }

    private void setupPermissions() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_POST);
            }
        }
    }

    public void startVpn() {
        Intent intent = VpnService.prepare(this);
        if (intent != null) {
            vpnLauncher.launch(intent);
        } else {
            activateVpn();
        }
    }

    public void stopVpn() {
        Intent intent = new Intent(this, BlockerVpnService.class);
        intent.setAction(BlockerVpnService.ACTION_STOP);
        startService(intent);
        Toast.makeText(this, "VPN stopped", Toast.LENGTH_SHORT).show();
    }

    private void activateVpn() {
        if (BlockerVpnService.isRunning) {
            Toast.makeText(this, "VPN already active", Toast.LENGTH_SHORT).show();
            return;
        }
        
        Intent intent = new Intent(this, BlockerVpnService.class);
        intent.setAction(BlockerVpnService.ACTION_START);
        startService(intent);
        Toast.makeText(this, "VPN started", Toast.LENGTH_SHORT).show();
    }

    public boolean isVpnRunning() {
        return BlockerVpnService.isRunning;
    }

    public int getBlockedCount() {
        return BlockerVpnService.blockedCount.get();
    }
}