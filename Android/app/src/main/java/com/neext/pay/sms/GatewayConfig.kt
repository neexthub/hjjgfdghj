package com.neext.pay.sms

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class GatewayConfig(context: Context) {
    val prefs = context.getSharedPreferences("gateway", Context.MODE_PRIVATE)
    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).commit() }
    val endpoint get() = prefs.getString("endpoint", "").orEmpty()
    val phone get() = prefs.getString("phone", "").orEmpty()
    val configured get() = endpoint.isNotEmpty() && phone.isNotEmpty() && prefs.contains("key")
    val deviceId: String get() {
        val old = prefs.getString("device", null)
        if (old != null) return old
        val id = UUID.randomUUID().toString(); prefs.edit().putString("device", id).commit(); return id
    }
    private fun secret(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("neext-api", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("neext-api", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun apiKey(): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secret(), GCMParameterSpec(128, Base64.decode(prefs.getString("iv", ""), Base64.NO_WRAP)))
        return String(cipher.doFinal(Base64.decode(prefs.getString("key", ""), Base64.NO_WRAP)), Charsets.UTF_8)
    }
    fun save(url: String, key: String, number: String) {
        val normalized = GatewayRules.endpoint(url)
        require(key.startsWith("npk_") && key.length in 20..128) { "SMS phone API key দিন" }
        require(GatewayRules.validPhone(number)) { "সঠিক receiving wallet নম্বর দিন" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, secret()) }
        val encrypted = cipher.doFinal(key.toByteArray(Charsets.UTF_8))
        prefs.edit().putString("endpoint", normalized).putString("phone", number)
            .putString("key", Base64.encodeToString(encrypted, Base64.NO_WRAP)).putString("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP)).commit()
    }
    fun status(message: String) { prefs.edit().putString("status", message).apply() }
}