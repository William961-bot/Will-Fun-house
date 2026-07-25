package com.pornblocker

import android.content.Context
import java.io.BufferedReader
import java.io.InputStreamReader

class BlocklistManager(private val context: Context) {

    private final blockedHosts = new java.util.HashSet<String>()
    private final blockedPorts = new java.util.HashSet<Integer>()

    public BlocklistManager(Context context) {
        this.context = context;
        loadDefaults();
    }

    public void loadDefaults() {
        blockedHosts.addAll(assetsOrRawHosts())
        blockedHosts.addAll(hardcodedSeed())
    }

    public boolean isBlocked(String host) {
        String h = host.toLowerCase().trim();
        if (h.isEmpty()) return false
        for (String entry : blockedHosts) {
            if (h.equals(entry) || h.endsWith("." + entry)) return true
        }
        return false
    }

    public boolean isBlockedPort(int port) {
        return blockedPorts.contains(port)
    }

    private java.util.Set<String> assetsOrRawHosts() {
        try {
            InputStream raw = context.getResources().openRawResource(R.raw.blocklist)
            BufferedReader reader = new BufferedReader(new InputStreamReader(raw))
            java.util.Set<String> linesSet = new java.util.HashSet<String>()
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim().toLowerCase()
                if (!line.isEmpty() && !line.startsWith("#")) {
                    linesSet.add(line)
                }
            }
            reader.close()
            return linesSet
        } catch (Exception e) {
            return new java.util.HashSet<String>()
        }
    }

    private java.util.Set<String> hardcodedSeed() {
        java.util.Set<String> set = new java.util.HashSet<String>()
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
        for (String h : hosts) set.add(h)
        return set
    }
}
