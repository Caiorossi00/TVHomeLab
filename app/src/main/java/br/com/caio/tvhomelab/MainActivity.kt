
package br.com.caio.tvhomelab

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {

    private lateinit var webView: WebView

    private val applications = mapOf(
        "stremio" to "com.stremio.one",
        "youtube" to "com.google.android.youtube.tv",
        "veloplay" to "com.global.veloplaytv"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(AppBridge(), "Android")

        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")
    }

    private inner class AppBridge {

        @JavascriptInterface
        fun openApp(appId: String) {
            runOnUiThread {
                val packageName = applications[appId]

                if (packageName == null) {
                    Toast.makeText(
                        this@MainActivity,
                        "Atalho desconhecido",
                        Toast.LENGTH_SHORT
                    ).show()
                    return@runOnUiThread
                }

                val launchIntent =
                    packageManager.getLaunchIntentForPackage(packageName)

                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(launchIntent)
                } else {
                    Toast.makeText(
                        this@MainActivity,
                        "Não foi possível abrir o aplicativo",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        @JavascriptInterface
        fun openSettings() {
            runOnUiThread {
                try {
                    val intent = Intent(Settings.ACTION_SETTINGS)
                    startActivity(intent)
                } catch (_: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        "Não foi possível abrir as configurações",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    override fun onBackPressed() {
        finish()
    }
}
