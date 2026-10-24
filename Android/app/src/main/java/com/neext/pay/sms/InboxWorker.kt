package com.neext.pay.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.work.*
import java.text.SimpleDateFormat
import java.util.*

class InboxWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val config = GatewayConfig(applicationContext)
        if (!config.enabled || !config.configured || config.prefs.getBoolean("inbox_imported", false)) return Result.success()
        if (applicationContext.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) return Result.success()
        var added = 0L
        try {
            SmsQueue(applicationContext).use { queue ->
                applicationContext.contentResolver.query(Telephony.Sms.Inbox.CONTENT_URI, arrayOf("address", "body", "date"), null, null, "date ASC")?.use { cursor ->
                    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
                    while (cursor.moveToNext()) {
                        if (isStopped || !config.enabled) return Result.retry()
                        val sender = cursor.getString(0).orEmpty(); val body = cursor.getString(1).orEmpty()
                        if (GatewayRules.paymentSms(sender, body) && queue.add(sender, body, format.format(Date(cursor.getLong(2))))) added++
                    }
                } ?: return Result.retry()
            }
            config.prefs.edit().putBoolean("inbox_imported", true).apply()
            config.status("পুরোনো wallet SMS পরীক্ষা শেষ")
            DeliveryWorker.schedule(applicationContext)
            return Result.success()
        } catch (_: Exception) { config.status("পুরোনো SMS পড়া যায়নি — অনুমতি যাচাই করুন"); return Result.retry() }
        finally { if (added > 0) config.prefs.edit().putLong("received",config.prefs.getLong("received",0)+added).apply(); GatewayService.refresh(applicationContext) }
    }
    companion object {
        fun schedule(context: Context) { WorkManager.getInstance(context).enqueueUniqueWork("sms-inbox",ExistingWorkPolicy.KEEP,OneTimeWorkRequestBuilder<InboxWorker>().build()) }
    }
}