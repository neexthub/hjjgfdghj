package com.neext.pay.sms

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class GatewayService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onCreate() { super.onCreate(); if (Build.VERSION.SDK_INT >= 26) (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(NotificationChannel("gateway", "SMS gateway status", NotificationManager.IMPORTANCE_LOW)) }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") {
            GatewayConfig(this).enabled = false; DeliveryWorker.cancel(this); stopForeground(true); stopSelf(); return START_NOT_STICKY
        }
        val config = GatewayConfig(this)
        if (!config.enabled || !config.configured) { stopSelf(); return START_NOT_STICKY }
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(1, notification(this), ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING) else startForeground(1, notification(this))
        } catch (_: Exception) { config.status("Background service বন্ধ — অ্যাপ খুলে Start চাপুন"); stopSelf(); return START_NOT_STICKY }
        DeliveryWorker.periodic(this)
        return START_STICKY
    }
    companion object {
        fun notification(context: Context): Notification {
            val config = GatewayConfig(context); val p = config.prefs
            val pending = SmsQueue(context).use { it.count() }
            val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val stop = PendingIntent.getService(context, 1, Intent(context, GatewayService::class.java).setAction("STOP"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val detail = "${config.phone} · Received ${p.getLong("received",0)} · Sent ${p.getLong("sent",0)} · Queue $pending · Matched ${p.getLong("matched",0)}\n${p.getString("status", "SMS-এর অপেক্ষায়") }"
            return NotificationCompat.Builder(context, "gateway").setSmallIcon(R.drawable.ic_gateway).setContentTitle("Neext Pay • SMS gateway")
                .setContentText("Sent ${p.getLong("sent",0)} · Queue $pending").setStyle(NotificationCompat.BigTextStyle().bigText(detail))
                .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setSilent(true).addAction(0, "Settings", open).addAction(0, "Stop", stop).build()
        }
        fun start(context: Context): Boolean = try { ContextCompat.startForegroundService(context, Intent(context, GatewayService::class.java)); true }
            catch (_: Exception) { GatewayConfig(context).status("অ্যাপ খুলে Start চাপুন — background চালু করা যায়নি"); false }
        fun refresh(context: Context) { if (GatewayConfig(context).enabled) try { (context.getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(1, notification(context)) } catch (_: Exception) { } }
    }
}