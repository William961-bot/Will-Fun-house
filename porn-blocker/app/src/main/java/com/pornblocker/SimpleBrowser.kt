package com.pornblocker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment

class SimpleBrowser : Fragment() {

    companion object {
        fun newInstance() = SimpleBrowser()
    }

    private var webView: WebView? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return WebView(requireContext()).also { webView = it }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        webView?.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    if (url != null && (BlocklistManager(view!!.context)).isBlocked(url)) {
                        loadData(
                            "<h1>Blocked</h1><p>This site is blocked by your settings.</p>",
                            "text/html",
                            "UTF-8"
                        )
                    }
                }
            }
            loadData("<h1>Ready</h1>", "text/html", "UTF-8")
        }
    }

    fun load(url: String) {
        webView?.loadUrl(url)
    }

    override fun onDestroyView() {
        webView?.apply {
            webViewClient = WebViewClient()
            stopLoading()
            loadUrl("about:blank")
            clearHistory()
            removeAllViews()
            destroy()
        }
        webView = null
        super.onDestroyView()
    }
}
