package com.neext.pay.sms

import android.content.*
import android.provider.Telephony
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val config = GatewayConfig(context)
        if (!config.enabled || !config.configured) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (parts.isEmpty()) return
        val sender = parts.first().originatingAddress.orEmpty(); val body = parts.joinToString("") { it.messageBody.orEmpty() }
        if (!GatewayRules.paymentSms(sender, body)) return
        val result = goAsync()
        executor.execute {
            try {
                val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(parts.first().timestampMillis))
                val added = SmsQueue(context).use { it.add(sender, body, date) }
                if (added) config.prefs.edit().putLong("received", config.prefs.getLong("received",0)+1).apply()
                DeliveryWorker.schedule(context); GatewayService.refresh(context)
            } finally { result.finish() }
        }
    }
    companion object { private val executor = Executors.newSingleThreadExecutor() }
}