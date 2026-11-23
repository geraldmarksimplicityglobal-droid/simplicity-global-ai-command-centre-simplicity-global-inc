package com.simplicityglobal.androidengineering

import java.security.MessageDigest

object CertificateFingerprint {
    fun sha256(certificateBytes: ByteArray): String {
        require(certificateBytes.isNotEmpty()) { "Certificate bytes must not be empty." }
        return MessageDigest.getInstance("SHA-256")
            .digest(certificateBytes)
            .joinToString("") { byte -> "%02X".format(byte) }
            .chunked(2)
            .joinToString(":")
    }
}
