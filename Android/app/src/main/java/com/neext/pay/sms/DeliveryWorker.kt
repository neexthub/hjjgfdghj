package com.neext.pay.sms

import android.content.Context
import androidx.work.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.TimeUnit

class DeliveryWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val config = GatewayConfig(applicationContext)
        if (!config.enabled || !config.configured) return Result.success()
        val queue = SmsQueue(applicationContext)
        try {
            repeat(4) {
                if (!config.enabled) return Result.success()
                val rows = queue.batch()
                if (rows.isEmpty()) return Result.success()
                val messages = JSONArray()
                rows.forEach { messages.put(JSONObject().put("sender", it.sender).put("body", it.body).put("receivedAt", it.receivedAt)) }
                val payload = JSONObject().put("deviceId", config.deviceId).put("platform", "android").put("phoneNumber", config.phone).put("messages", messages)
                val connection = URL(config.endpoint).openConnection() as HttpsURLConnection
                try {
                    connection.requestMethod = "POST"; connection.connectTimeout = 15000; connection.readTimeout = 30000; connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Authorization", "Bearer ${config.apiKey()}")
                    connection.instanceFollowRedirects = false
                    connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                    val code = connection.responseCode
                    if (code == 200) {
                        val response = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                        if (!response.has("received") || response.optInt("received") != rows.size) {
                            config.status("ভুল API response — URL ঠিক করুন"); GatewayService.refresh(applicationContext); return Result.failure()
                        }
                        queue.acknowledge(rows)
                        val prefs = config.prefs
                        prefs.edit().putLong("sent", prefs.getLong("sent", 0) + rows.size).putLong("matched", prefs.getLong("matched", 0) + response.optInt("matched"))
                            .putLong("last_success", System.currentTimeMillis()).apply()
                        config.status("SMS পাঠানো সফল")
                    } else {
                        config.status(when (code) { 401 -> "API key ভুল/বন্ধ — Settings ঠিক করুন"; 403 -> "Device অন্য key-তে যুক্ত/বন্ধ — Admin যাচাই করুন"; 400 -> "API URL/নম্বর/বার্তা যাচাই করুন"; else -> "HTTP $code — আবার চেষ্টা হবে" })
                        GatewayService.refresh(applicationContext)
                        return if (code in listOf(400,401,403,404,410,413,422) || code in 300..399) Result.failure() else Result.retry()
                    }
                } finally { connection.disconnect() }
                GatewayService.refresh(applicationContext)
            }
            return if (queue.count() > 0) Result.retry() else Result.success()
        } catch (_: Exception) {
            config.status("সংযোগ হয়নি — SMS নিরাপদে অপেক্ষায় আছে")
            GatewayService.refresh(applicationContext); return Result.retry()
        } finally { queue.close() }
    }
    companion object {
        private fun constraints() = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        fun schedule(context: Context) {
            val request = OneTimeWorkRequestBuilder<DeliveryWorker>().setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork("sms-send", ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
        fun periodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<DeliveryWorker>(15, TimeUnit.MINUTES).setConstraints(constraints()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("sms-recovery", ExistingPeriodicWorkPolicy.KEEP, request)
        }
        fun cancel(context: Context) { WorkManager.getInstance(context).cancelUniqueWork("sms-send"); WorkManager.getInstance(context).cancelUniqueWork("sms-recovery") }
    }
}