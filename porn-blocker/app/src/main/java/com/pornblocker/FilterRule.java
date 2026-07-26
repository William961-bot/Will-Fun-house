package com.pornblocker;

/**
 * Filter rule model
 */
public class FilterRule {
    public String domain;
    public boolean blocked;
    public String category;
    public long timestamp;
    public String reason;

    public FilterRule() {}

    public FilterRule(String domain, boolean blocked, String category, String reason) {
        this.domain = domain.toLowerCase();
        this.blocked = blocked;
        this.category = category;
        this.timestamp = System.currentTimeMillis();
        this.reason = reason;
    }
}