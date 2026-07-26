package com.pornblocker;

/**
 * Schedule model for focus mode
 */
public class Schedule {
    public boolean enabled;
    public String startTime;  // HH:MM format
    public String endTime;    // HH:MM format
    public boolean weekdaysOnly;

    public Schedule() {
        this.enabled = false;
        this.startTime = "00:00";
        this.endTime = "23:59";
        this.weekdaysOnly = false;
    }

    public Schedule(boolean enabled, String startTime, String endTime, boolean weekdaysOnly) {
        this.enabled = enabled;
        this.startTime = startTime;
        this.endTime = endTime;
        this.weekdaysOnly = weekdaysOnly;
    }
}