package com.pornblocker;

/**
 * Content categories for filtering
 */
public enum ContentCategory {
    ADULT("Adult Content", true),
    SOCIAL_MEDIA("Social Media", false),
    NEWS("News", false),
    VIDEO("Video Sites", false),
    GAMING("Gaming", false),
    SHOPPING("Shopping", false),
    FILE_SHARING("File Sharing", true),
    TORRENT("Torrent Sites", true);

    private final String name;
    private final boolean defaultBlocked;

    ContentCategory(String name, boolean defaultBlocked) {
        this.name = name;
        this.defaultBlocked = defaultBlocked;
    }

    public String getName() { return name; }
    public boolean getDefaultBlocked() { return defaultBlocked; }
}