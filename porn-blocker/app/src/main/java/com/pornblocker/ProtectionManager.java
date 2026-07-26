package com.pornblocker;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Manager for protection state and settings
 */
public class ProtectionManager {

    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_PROTECTION_ACTIVE = "protection_active";
    private static final String KEY_PIN = "protection_pin";
    private static final String KEY_SCHEDULE_ENABLED = "schedule_enabled";
    private static final String KEY_SCHEDULE_START = "schedule_start";
    private static final String KEY_SCHEDULE_END = "schedule_end";

    public static void setProtectionActive(Context context, boolean active) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_PROTECTION_ACTIVE, active)
                .apply();
    }

    public static boolean isProtectionActive(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_PROTECTION_ACTIVE, false);
    }

    public static void setPin(Context context, String pin) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_PIN, pin)
                .apply();
    }

    public static String getPin(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_PIN, null);
    }

    public static boolean verifyPin(Context context, String pin) {
        String savedPin = getPin(context);
        return savedPin != null && savedPin.equals(pin);
    }

    public static void setScheduleEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_SCHEDULE_ENABLED, enabled)
                .apply();
    }

    public static boolean isScheduleEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(KEY_SCHEDULE_ENABLED, false);
    }

    public static void setSchedule(Context context, String start, String end) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_SCHEDULE_START, start)
                .putString(KEY_SCHEDULE_END, end)
                .apply();
    }

    public static String getScheduleStart(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_SCHEDULE_START, "00:00");
    }

    public static String getScheduleEnd(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_SCHEDULE_END, "23:59");
    }
}