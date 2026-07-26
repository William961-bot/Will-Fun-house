package com.pornblocker;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.Set;

public class BlocklistManager {

    private static final String PREFS = "blocklist_prefs";
    private static final String KEY_USER = "user_domains";

    public static Set<String> getAllBlockedHosts(Context context) {
        Set<String> result = new HashSet<>();
        result.addAll(readPrefs(context));
        result.addAll(getHardcodedSeed());
        try {
            result.addAll(getAssetsHosts(context));
        } catch (Exception ignored) {}
        return result;
    }

    public static void addBlockedDomain(Context context, String domain) {
        String clean = domain.trim().toLowerCase().split("/")[0];
        if (clean.isEmpty()) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> current = prefs.getStringSet(KEY_USER, new HashSet<>());
        Set<String> updated = new HashSet<>(current);
        updated.add(clean);
        prefs.edit().putStringSet(KEY_USER, updated).apply();
    }

    private static Set<String> readPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return prefs.getStringSet(KEY_USER, new HashSet<>());
    }

    private static Set<String> getAssetsHosts(Context context) {
        Set<String> result = new HashSet<>();
        try {
            int resId = context.getResources().getIdentifier("raw_blocklist", "raw", context.getPackageName());
            if (resId != 0) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(context.getResources().openRawResource(resId)));
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim().toLowerCase();
                    if (!line.isEmpty() && !line.startsWith("#")) {
                        result.add(line);
                    }
                }
            }
        } catch (Exception ignored) {}
        return result;
    }

    private static Set<String> getHardcodedSeed() {
        Set<String> result = new HashSet<>();
        result.add("pornhub.com");
        result.add("xvideos.com");
        result.add("xnxx.com");
        result.add("xhamster.com");
        result.add("youporn.com");
        result.add("redtube.com");
        result.add("tube8.com");
        result.add("spankbang.com");
        result.add("porn.com");
        result.add("brazzers.com");
        result.add("onlyfans.com");
        result.add("chaturbate.com");
        result.add("cam4.com");
        result.add("livejasmin.com");
        result.add("myfreecams.com");
        result.add("pornmd.com");
        result.add("tnaflix.com");
        result.add("faphouse.com");
        result.add("manyvids.com");
        result.add("thothub.lol");
        result.add("motherless.com");
        result.add("eporner.com");
        result.add("drtuber.com");
        result.add("xxxbunker.com");
        result.add("sunporno.com");
        return result;
    }
}