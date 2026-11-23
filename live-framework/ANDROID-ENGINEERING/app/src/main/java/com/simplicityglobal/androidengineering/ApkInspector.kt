package com.simplicityglobal.androidengineering

import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Build.VERSION_CODES.P
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

data class ApkReport(
    val packageName: String,
    val versionName: String?,
    val versionCode: Long,
    val certificateSha256: List<String>,
    val signed: Boolean,
)

class ApkInspector(private val context: Context) {
    @Suppress("DEPRECATION")
    suspend fun inspect(uri: Uri): ApkReport = withContext(Dispatchers.IO) {
        val tempApk = File.createTempFile("sg-apk-inspect-", ".apk", context.cacheDir)
        try {
            val input = context.contentResolver.openInputStream(uri)
                ?: error("The selected APK could not be opened.")
            input.use { source ->
                tempApk.outputStream().use { output -> source.copyTo(output) }
            }

            val flags = if (Build.VERSION.SDK_INT >= P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                PackageManager.GET_SIGNATURES
            }
            val packageInfo = context.packageManager.getPackageArchiveInfo(tempApk.absolutePath, flags)
                ?: error("The selected file is not a readable Android APK.")

            val signatures = if (Build.VERSION.SDK_INT >= P) {
                packageInfo.signingInfo?.apkContentsSigners.orEmpty()
            } else {
                packageInfo.signatures.orEmpty()
            }
            val fingerprints = signatures.map { signature ->
                CertificateFingerprint.sha256(signature.toByteArray())
            }
            val versionCode = if (Build.VERSION.SDK_INT >= P) {
                packageInfo.longVersionCode
            } else {
                packageInfo.versionCode.toLong()
            }
            ApkReport(
                packageName = packageInfo.packageName,
                versionName = packageInfo.versionName,
                versionCode = versionCode,
                certificateSha256 = fingerprints,
                signed = fingerprints.isNotEmpty(),
            )
        } finally {
            tempApk.delete()
        }
    }
}
