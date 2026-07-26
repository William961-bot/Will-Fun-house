package com.pornblocker;

/**
 * Blocked request log entry
 */
public class BlockedRequest {
    public String domain;
    public long timestamp;
    public String reason;
    public String category;
    public boolean wasTemporaryAccess = false;

    public BlockedRequest() {}

    public BlockedRequest(String domain, String reason, String category) {
        this.domain = domain;
        this.timestamp = System.currentTimeMillis();
        this.reason = reason;
        this.category = category;
    }

    public String getFormattedTime() {
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("MMM dd, HH:mm", java.util.Locale.getDefault());
        return sdf.format(new java.util.Date(timestamp));
    }
}