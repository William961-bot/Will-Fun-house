package com.pornblocker

import android.content.Context
import java.io.BufferedReader
import java.io.InputStreamReader

class BlocklistManager(private val context: Context) {

    private val blockedHosts = mutableSetOf<String>()
    private val blockedPorts = mutableSetOf<Int>()

    init {
        loadDefaults()
    }

    fun loadDefaults() {
        blockedHosts += assetsOrRawHosts()
        blockedHosts += hardcodedSeed()
    }

    fun isBlocked(host: String): Boolean {
        val h = host.lowercase().trim()
        if (h.isEmpty()) return false
        return blockedHosts.any { h == it || h.endsWith(".$it") }
    }

    fun isBlockedPort(port: Int) = blockedPorts.contains(port)

    private fun assetsOrRawHosts(): Set<String> {
        return try {
            val raw = context.resources.openRawResource(R.raw.blocklist)
            val reader = BufferedReader(InputStreamReader(raw))
            reader.useLines { lines ->
                lines.map { it.trim().lowercase() }
                    .filter { it.isNotEmpty() && !it.startsWith("#") }
                    .toSet()
            }
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun hardcodedSeed(): Set<String> = buildSet {
        addAll(
            listOf(
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
            )
        )
    }
}
