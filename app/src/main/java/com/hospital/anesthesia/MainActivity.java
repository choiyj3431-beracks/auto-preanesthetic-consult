package com.hospital.anesthesia;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setSupportZoom(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");

        // file:// 로 로컬 에셋 로드
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    public class Bridge {

        @JavascriptInterface
        public void saveConfig(String json) {
            getSharedPreferences("app", MODE_PRIVATE).edit()
                .putString("config", json).apply();
        }

        @JavascriptInterface
        public String loadConfig() {
            return getSharedPreferences("app", MODE_PRIVATE)
                .getString("config", "{}");
        }

        @JavascriptInterface
        public void copyToClipboard(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("협진", text));
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "클립보드에 복사됐습니다", Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public void saveFile(String content, String name) {
            try {
                String date = new SimpleDateFormat("yyyyMMdd", Locale.KOREA).format(new Date());
                String filename = "마취협진_" + (name != null && !name.isEmpty() ? name : "환자") + "_" + date + ".txt";
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(f)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "저장 완료: 다운로드/" + filename, Toast.LENGTH_LONG).show());
            } catch (IOException e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "저장 실패: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public void showToast(String msg) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
