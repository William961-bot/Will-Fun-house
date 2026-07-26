package com.pornblocker;

import java.util.Set;
import java.util.List;

/**
 * Core filtering logic for content blocking
 */
public class FilterEngine {

    private ProtectionManager protectionManager;

    public FilterEngine(ProtectionManager manager) {
        this.protectionManager = manager;
    }

    /**
     * Determine if a domain should be blocked
     * Priority: Allowlist > Blocklist > Categories > Keywords
     */
    public boolean shouldBlock(String domain) {
        if (domain == null) return false;
        
        String cleanDomain = domain.toLowerCase().replaceAll("https?://", "").replaceAll(".*/", "");

        // 1. Check allowlist (always allowed)
        Set<String> allowlist = protectionManager.getAllowlist();
        if (allowlist.contains(cleanDomain)) {
            return false;
        }

        // 2. Check blocklist (always blocked)
        Set<String> blocklist = protectionManager.getBlocklist();
        if (blocklist.contains(cleanDomain)) {
            return true;
        }

        // 3. Check temporary access
        if (protectionManager.hasTemporaryAccess(cleanDomain)) {
            return false;
        }

        // 4. Check keywords
        List<String> keywords = protectionManager.getKeywords();
        for (String keyword : keywords) {
            if (cleanDomain.toLowerCase().contains(keyword.toLowerCase())) {
                return true;
            }
        }

        // 5. Check categories (via CleanBrowsing DNS)
        // This is handled by CleanBrowsing, we just pass through
        return false;
    }

    /**
     * Get the reason for blocking
     */
    public String getBlockReason(String domain) {
        String cleanDomain = domain.toLowerCase().replaceAll("https?://", "").replaceAll(".*/", "");

        Set<String> allowlist = protectionManager.getAllowlist();
        if (allowlist.contains(cleanDomain)) {
            return "Allowed by allowlist";
        }

        Set<String> blocklist = protectionManager.getBlocklist();
        if (blocklist.contains(cleanDomain)) {
            return "Added to blocklist";
        }

        if (protectionManager.hasTemporaryAccess(cleanDomain)) {
            return "Temporary access granted";
        }

        List<String> keywords = protectionManager.getKeywords();
        for (String keyword : keywords) {
            if (cleanDomain.toLowerCase().contains(keyword.toLowerCase())) {
                return "Contains blocked keyword: " + keyword;
            }
        }

        return "Blocked by CleanBrowsing DNS";
    }

    /**
     * Get category for a domain (if known)
     */
    public String getCategory(String domain) {
        String cleanDomain = domain.toLowerCase().replaceAll("https?://", "").replaceAll(".*/", "");

        // Known adult domains
        Set<String> blocklist = protectionManager.getBlocklist();
        if (blocklist.contains(cleanDomain)) {
            return "Custom Blocklist";
        }

        // Check keywords for category hints
        List<String> keywords = protectionManager.getKeywords();
        for (String keyword : keywords) {
            if (cleanDomain.contains("porn") || cleanDomain.contains("xxx")) {
                return "Adult Content";
            }
            if (cleanDomain.contains("torrent") || cleanDomain.contains("magnet")) {
                return "File Sharing";
            }
        }

        return "General";
    }
}