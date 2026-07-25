package com.pornblocker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment

public class SimpleBrowser extends Fragment {

    public static SimpleBrowser newInstance() {
        return new SimpleBrowser()
    }

    private WebView webView;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        WebView wv = new WebView(requireContext());
        this.webView = wv;
        return wv;
    }

    @Override
    public void onViewCreated(View view, Bundle savedInstanceState) {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(android.webkit.WebView view, String url) {
                if (url != null && new BlocklistManager(view.getContext()).isBlocked(url)) {
                    view.loadData(
                        "<h1>Blocked</h1><p>This site is blocked by your settings.</p>",
                        "text/html",
                        "UTF-8"
                    );
                }
            }
        });
        webView.loadData("<h1>Ready</h1>", "text/html", "UTF-8");
    }

    public void load(String url) {
        if (webView != null) webView.loadUrl(url);
    }

    @Override
    public void onDestroyView() {
        if (webView != null) {
            webView.setWebViewClient(new WebViewClient());
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroyView();
    }
}
