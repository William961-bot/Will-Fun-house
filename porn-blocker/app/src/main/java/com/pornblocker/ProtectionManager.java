package com.pornblocker;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Central manager for all protection settings and state
 */
public class ProtectionManager {

    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_PROTECTION_ACTIVE = "protection_active";
    private static final String KEY_PIN = "protection_pin";
    private static final String KEY_PIN_CREATED = "pin_created";
    private static final String KEY_ALLOWLIST = "allowlist";
    private static final String KEY_BLOCKLIST = "blocklist";
    private static final String KEY_CATEGORIES = "categories";
    private static final String KEY_KEYWORDS = "keywords";
    private static final String KEY_SCHEDULE = "schedule";
    private static final String KEY_ACTIVITY_LOG = "activity_log";
    private static final String KEY_TEMPORARY_ACCESS = "temp_access";

    private static ProtectionManager instance;
    private SharedPreferences prefs;
    private Gson gson;

    private ProtectionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        gson = new Gson();
    }

    public static synchronized ProtectionManager getInstance(Context context) {
        if (instance == null) {
            instance = new ProtectionManager(context);
        }
        return instance;
    }

    // Protection state
    public void setProtectionActive(boolean active) {
        prefs.edit().putBoolean(KEY_PROTECTION_ACTIVE, active).apply();
    }

    public boolean isProtectionActive() {
        return prefs.getBoolean(KEY_PROTECTION_ACTIVE, false);
    }

    // PIN management
    public void setPin(String pin) {
        prefs.edit().putString(KEY_PIN, pin).putBoolean(KEY_PIN_CREATED, true).apply();
    }

    public boolean verifyPin(String pin) {
        String savedPin = prefs.getString(KEY_PIN, null);
        return savedPin != null && savedPin.equals(pin);
    }

    public boolean isPinCreated() {
        return prefs.getBoolean(KEY_PIN_CREATED, false);
    }

    // Allowlist/Blocklist
    public void addToAllowlist(String domain) {
        Set<String> list = getAllowlist();
        list.add(domain.toLowerCase());
        prefs.edit().putStringSet(KEY_ALLOWLIST, list).apply();
    }

    public void removeFromAllowlist(String domain) {
        Set<String> list = getAllowlist();
        list.remove(domain.toLowerCase());
        prefs.edit().putStringSet(KEY_ALLOWLIST, list).apply();
    }

    public Set<String> getAllowlist() {
        return prefs.getStringSet(KEY_ALLOWLIST, new HashSet<>());
    }

    public void addToBlocklist(String domain) {
        Set<String> list = getBlocklist();
        list.add(domain.toLowerCase());
        prefs.edit().putStringSet(KEY_BLOCKLIST, list).apply();
    }

    public void removeFromBlocklist(String domain) {
        Set<String> list = getBlocklist();
        list.remove(domain.toLowerCase());
        prefs.edit().putStringSet(KEY_BLOCKLIST, list).apply();
    }

    public Set<String> getBlocklist() {
        return prefs.getStringSet(KEY_BLOCKLIST, new HashSet<>());
    }

    // Categories
    public void setCategoriesEnabled(Set<String> categories) {
        prefs.edit().putStringSet(KEY_CATEGORIES, categories).apply();
    }

    public Set<String> getEnabledCategories() {
        return prefs.getStringSet(KEY_CATEGORIES, getDefaultCategories());
    }

    private Set<String> getDefaultCategories() {
        Set<String> defaults = new HashSet<>();
        defaults.add(ContentCategory.ADULT.name());
        return defaults;
    }

    // Keywords
    public void setKeywords(List<String> keywords) {
        prefs.edit().putString(KEY_KEYWORDS, gson.toJson(keywords)).apply();
    }

    public List<String> getKeywords() {
        String json = prefs.getString(KEY_KEYWORDS, "[]");
        Type type = new TypeToken<ArrayList<String>>(){}.getType();
        return gson.fromJson(json, type);
    }

    // Schedule
    public void setSchedule(Schedule schedule) {
        prefs.edit().putString(KEY_SCHEDULE, gson.toJson(schedule)).apply();
    }

    public Schedule getSchedule() {
        String json = prefs.getString(KEY_SCHEDULE, "");
        if (json.isEmpty()) return new Schedule();
        return gson.fromJson(json, Schedule.class);
    }

    // Activity log
    public void addBlockedRequest(BlockedRequest request) {
        List<BlockedRequest> log = getActivityLog();
        log.add(0, request); // Add to top
        if (log.size() > 100) {
            log = log.subList(0, 100); // Keep only last 100
        }
        prefs.edit().putString(KEY_ACTIVITY_LOG, gson.toJson(log)).apply();
    }

    @SuppressWarnings("unchecked")
    public List<BlockedRequest> getActivityLog() {
        String json = prefs.getString(KEY_ACTIVITY_LOG, "[]");
        Type type = new TypeToken<ArrayList<BlockedRequest>>(){}.getType();
        return gson.fromJson(json, type);
    }

    public void clearActivityLog() {
        prefs.edit().remove(KEY_ACTIVITY_LOG).apply();
    }

    // Temporary access
    public void grantTemporaryAccess(String domain, long durationMinutes) {
        Set<String> tempAccess = prefs.getStringSet(KEY_TEMPORARY_ACCESS, new HashSet<>());
        tempAccess.add(domain + ":" + (System.currentTimeMillis() + durationMinutes * 60 * 1000));
        prefs.edit().putStringSet(KEY_TEMPORARY_ACCESS, tempAccess).apply();
    }

    public boolean hasTemporaryAccess(String domain) {
        Set<String> tempAccess = prefs.getStringSet(KEY_TEMPORARY_ACCESS, new HashSet<>());
        long now = System.currentTimeMillis();
        Set<String> valid = new HashSet<>();
        for (String entry : tempAccess) {
            String[] parts = entry.split(":");
            if (parts.length == 2) {
                long expiry = Long.parseLong(parts[1]);
                if (expiry > now) {
                    valid.add(domain);
                }
            }
        }
        prefs.edit().putStringSet(KEY_TEMPORARY_ACCESS, valid).apply();
        return valid.contains(domain);
    }

    // Reset all settings
    public void resetAll() {
        prefs.edit().clear().apply();
    }
}