package com.pornblocker;

/**
 * User roles in the system
 */
public enum UserRole {
    GUARDIAN("guardian"),
    PROTECTED_USER("protected_user"),
    ADMIN("admin");

    private final String value;

    UserRole(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static UserRole fromValue(String value) {
        if (value == null) return null;
        for (UserRole role : values()) {
            if (role.value.equals(value)) {
                return role;
            }
        }
        return null;
    }
}