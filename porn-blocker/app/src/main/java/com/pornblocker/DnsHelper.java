package com.pornblocker;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.util.Log;

/**
 * Helper for DNS configuration and Private DNS status
 */
public class DnsHelper {

    private static final String TAG = "DnsHelper";
    private static final String CLEANBROWSING_FAMILY_DNS = "family-filtered.cleanbrowsing.org";
    private static final String[] CLEANBROWSING_IP = {"185.228.168.9", "185.228.169.9"};

    /**
     * Check if Private DNS is using CleanBrowsing
     * Note: This checks the DNS servers being used, not Private DNS settings
     */
    public static boolean isCleanBrowsingActive(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Fallback to checking VPN or use default
            return false;
        }

        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        Network activeNetwork = cm.getActiveNetwork();
        
        if (activeNetwork == null) return false;
        
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(activeNetwork);
        if (capabilities == null) return false;

        // Check if we're using CleanBrowsing DNS via VPN
        // Private DNS checking is limited, so we rely on VPN service status
        return BlockerVpnService.isRunning;
    }

    /**
     * Get CleanBrowsing DNS servers
     */
    public static String[] getCleanBrowsingDns() {
        return CLEANBROWSING_IP;
    }

    /**
     * Check if device supports Private DNS
     */
    public static boolean supportsPrivateDns() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }
}