package com.chatkaro.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private var webView: WebView? = null
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val appUrl = "https://chatkaro-7cv0.onrender.com"

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
        private const val PERMISSION_REQUEST_CODE = 2001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request microphone permission at startup for voice note recording
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val audioPerm = checkSelfPermission(Manifest.permission.RECORD_AUDIO)
            if (audioPerm != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), PERMISSION_REQUEST_CODE)
            }
        }

        val wv = WebView(this)
        webView = wv

        val settings: WebSettings = wv.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        val defaultUserAgent = settings.userAgentString ?: ""
        settings.userAgentString = "$defaultUserAgent ChatKaroAndroidApp/1.0"

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(wv, true)

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                // Keep ChatKaro and Google authentication inside the app WebView
                if (url.startsWith(appUrl) ||
                    url.startsWith("https://chatkaro") ||
                    url.contains("accounts.google.com") ||
                    url.contains("google.com/oauth")
                ) {
                    return false
                }

                // Open external links in system browser
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (e: Exception) {
                    false
                }
            }
        }

        wv.webChromeClient = object : WebChromeClient() {
            // File chooser for images, videos, audio, and documents
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                return try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                    true
                } catch (e: Exception) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    false
                }
            }

            // Grant microphone and media permissions requested by the web app
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        wv.loadUrl(appUrl)
        setContentView(wv)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            fileChooserCallback?.onReceiveValue(results)
            fileChooserCallback = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val wv = webView
        if (wv != null && wv.canGoBack()) {
            wv.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
