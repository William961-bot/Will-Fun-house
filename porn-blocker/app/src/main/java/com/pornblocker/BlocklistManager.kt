package com.pornblocker

import android.content.Context
import android.content.SharedPreferences

object BlocklistManager {

    private const val PREFS = "blocklist_prefs"
    private const val KEY_USER = "user_domains"
    private val hostLock = Any()

    fun getAllBlockedHosts(context: Context): Set<String> {
        return synchronized(hostLock) {
            val fromPrefs = readPrefs(context).toMutableSet()
            fromPrefs += assetsOrRawHosts(context)
            fromPrefs += hardcodedSeed()
            fromPrefs
        }
    }

    fun addBlockedDomain(context: Context, domain: String) {
        val clean = domain.trim().lowercase().split("/")[0]
        if (clean.isBlank()) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putStringSet(KEY_USER, (prefs.getStringSet(KEY_USER, emptySet()) ?: emptySet()) + clean).apply()
    }

    fun removeBlockedDomain(context: Context, domain: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val current = prefs.getStringSet(KEY_USER, emptySet()) ?: emptySet()
        if (!current.contains(domain)) return
        prefs.edit().putStringSet(KEY_USER, current - domain).apply()
    }

    private fun readPrefs(context: Context): Set<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getStringSet(KEY_USER, emptySet()) ?: emptySet()
    }

    private fun assetsOrRawHosts(context: Context): Set<String> {
        return try {
            val raw = context.resources.openRawResource(R.raw.blocklist)
            val reader = java.io.BufferedReader(java.io.InputStreamReader(raw))
            reader.useLines { lines ->
                lines.map { it.trim().lowercase() }
                    .filter { it.isNotEmpty() && !it.startsWith("#") }
                    .toSet()
            }
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun hardcodedSeed(): Set<String> = setOf(
        "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "youporn.com",
        "redtube.com", "tube8.com", "spankbang.com", "porn.com", "brazzers.com",
        "onlyfans.com", "chaturbate.com", "cam4.com", "livejasmin.com", "myfreecams.com",
        "pornmd.com", "tnaflix.com", "faphouse.com", "manyvids.com", "thothub.lol",
        "motherless.com", "eporner.com", "drtuber.com", "xxxbunker.com", "sunporno.com"
    )
}