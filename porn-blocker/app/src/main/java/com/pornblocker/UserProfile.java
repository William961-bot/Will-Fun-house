package com.pornblocker;

/**
 * User profile model
 */
public class UserProfile {
    public String id;
    public String email;
    public String displayName;
    public UserRole role;
    public String createdAt;

    public UserProfile() {}

    public UserProfile(String id, String email, String displayName, UserRole role) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.role = role;
    }
}