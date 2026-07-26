package com.pornblocker;

import android.content.Context;
import android.util.Log;

/**
 * Data manager for app settings
 * Note: No backend/cloud integration - all local storage
 */
public class DataManager {

    private static final String TAG = "DataManager";
    private static DataManager instance;
    private UserProfile currentUser;
    private Context context;

    private DataManager(Context context) {
        this.context = context.getApplicationContext();
        // Default user for local-only app
        this.currentUser = new UserProfile("local_user", "Local User", "Device User", UserRole.GUARDIAN);
    }

    public static synchronized DataManager getInstance(Context context) {
        if (instance == null) {
            instance = new DataManager(context);
        }
        return instance;
    }

    public UserProfile getCurrentUser() {
        return currentUser;
    }

    public void setCurrentUser(UserProfile user) {
        this.currentUser = user;
    }

    public boolean isLoggedIn() {
        return currentUser != null;
    }

    public UserRole getCurrentUserRole() {
        return currentUser != null ? currentUser.role : null;
    }
}