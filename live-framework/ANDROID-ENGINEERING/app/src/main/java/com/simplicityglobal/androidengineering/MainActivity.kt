package com.simplicityglobal.androidengineering

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AndroidEngineeringHome() }
    }
}

@androidx.compose.runtime.Composable
private fun AndroidEngineeringHome() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var selectedApk by remember { mutableStateOf<Uri?>(null) }
    var report by remember { mutableStateOf<ApkReport?>(null) }
    var status by remember {
        mutableStateOf("Ready. Choose an APK to inspect package metadata and signing certificate fingerprints.")
    }
    val apkPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            selectedApk = uri
            report = null
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION,
                )
            }
            status = "APK selected. Inspection is read-only; no file has been modified."
            scope.launch {
                runCatching { ApkInspector(context).inspect(uri) }
                    .onSuccess {
                        report = it
                        status = "Inspection completed. A valid signature does not prove an APK is safe or trusted."
                    }
                    .onFailure { error ->
                        status = "Inspection failed: ${error.message ?: "unknown error"}"
                    }
            }
        }
    }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text("S I M P L I C I T Y  G L O B A L", style = MaterialTheme.typography.labelLarge)
                Text("Android Engineering", style = MaterialTheme.typography.headlineMedium)
                Text("SG-ANDROID-ENGINEERING-001 · Mobile companion", style = MaterialTheme.typography.bodySmall)
                FeatureCard("01 · Project engineering", "Android project setup, Gradle builds, dependency review and version management.")
                FeatureCard("02 · APK inspection", "Read package name, version and signing-certificate SHA-256 fingerprints.")
                FeatureCard("03 · MT Manager handoff", "Share a selected APK through Android's system chooser. MT Manager must be installed and selected by the operator.")
                FeatureCard("04 · Signing governance", "Release signing is performed by the controlled build pipeline, not by storing private keys on this phone.")
                FeatureCard("05 · Quality and release", "Unit tests, build verification, signature checks and release evidence.")
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("APK inspection", style = MaterialTheme.typography.titleLarge)
                        Button(onClick = {
                            apkPicker.launch(
                                arrayOf("application/vnd.android.package-archive", "application/octet-stream"),
                            )
                        }) {
                            Text("Select APK")
                        }
                        if (selectedApk != null) {
                            OutlinedButton(onClick = {
                                val send = Intent(Intent.ACTION_SEND).apply {
                                    type = "application/vnd.android.package-archive"
                                    putExtra(Intent.EXTRA_STREAM, selectedApk)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                context.startActivity(Intent.createChooser(send, "Open APK with an installed app"))
                            }) {
                                Text("Share APK · MT Manager handoff")
                            }
                        }
                        Text(status, style = MaterialTheme.typography.bodyMedium)
                        report?.let { item ->
                            Text("Package: ${item.packageName}")
                            Text("Version: ${item.versionName ?: "unknown"} (${item.versionCode})")
                            Text("Signed: ${item.signed}")
                            item.certificateSha256.forEach { fingerprint ->
                                Text("SHA-256: $fingerprint", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "Safety: this companion does not bypass licensing, signature checks, DRM, anti-tamper controls or application protections. Inspect and modify only applications you own or are authorised to assess.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun FeatureCard(title: String, detail: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(detail, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
