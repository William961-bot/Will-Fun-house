package com.pornblocker;

import android.graphics.drawable.Drawable;

public class AppInfo {
    public final String packageName;
    public final String name;
    public final Drawable icon;

    public AppInfo(String packageName, String name, Drawable icon) {
        this.packageName = packageName;
        this.name = name;
        this.icon = icon;
    }
}