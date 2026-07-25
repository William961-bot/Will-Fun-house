package com.pornblocker;

import android.content.Context;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.Set;

public class BlocklistManager {

    private final Set<String> blockedHosts = new HashSet<String>();
    private final Set<Integer> blockedPorts = new HashSet<Integer>();
    private final Context context;

    public BlocklistManager(Context context) {
        this.context = context;
        loadDefaults();
    }

    public void loadDefaults() {
        blockedHosts.addAll(assetsOrRawHosts());
        blockedHosts.addAll(hardcodedSeed());
    }

    public boolean isBlocked(String host) {
        String h = host.toLowerCase().trim();
        if (h.isEmpty()) return false;
        for (String entry : blockedHosts) {
            if (h.equals(entry) || h.endsWith("." + entry)) return true;
        }
        return false;
    }

    public boolean isBlockedPort(int port) {
        return blockedPorts.contains(port);
    }

    public int getHostCount() {
        return blockedHosts.size();
    }

    private Set<String> assetsOrRawHosts() {
        try {
            java.io.InputStream raw = context.getResources().openRawResource(R.raw.blocklist);
            BufferedReader reader = new BufferedReader(new InputStreamReader(raw));
            Set<String> linesSet = new HashSet<String>();
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim().toLowerCase();
                if (!line.isEmpty() && !line.startsWith("#")) {
                    linesSet.add(line);
                }
            }
            reader.close();
            return linesSet;
        } catch (Exception e) {
            return new HashSet<String>();
        }
    }

    private Set<String> hardcodedSeed() {
        Set<String> set = new HashSet<String>();
        String[] hosts = new String[]{
            "pornhub.com",
            "xvideos.com",
            "xnxx.com",
            "xhamster.com",
            "youporn.com",
            "redtube.com",
            "tube8.com",
            "spankbang.com",
            "porn.com",
            "brazzers.com",
            "onlyfans.com",
            "chaturbate.com",
            "cam4.com",
            "livejasmin.com",
            "myfreecams.com"
        };
        for (String h : hosts) set.add(h);
        return set;
    }
}