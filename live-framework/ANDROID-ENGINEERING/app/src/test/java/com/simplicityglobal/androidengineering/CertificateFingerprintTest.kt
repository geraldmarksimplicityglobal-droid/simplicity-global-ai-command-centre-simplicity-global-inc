package com.simplicityglobal.androidengineering

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class CertificateFingerprintTest {
    @Test
    fun `sha256 fingerprint is uppercase colon separated hex`() {
        val fingerprint = CertificateFingerprint.sha256("abc".toByteArray())
        assertEquals(
            "BA:78:16:BF:8F:01:CF:EA:41:41:40:DE:5D:AE:22:23:B0:03:61:A3:96:17:7A:9C:B4:10:FF:61:F2:00:15:AD",
            fingerprint,
        )
    }

    @Test
    fun `empty certificate bytes are rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            CertificateFingerprint.sha256(byteArrayOf())
        }
    }
}
