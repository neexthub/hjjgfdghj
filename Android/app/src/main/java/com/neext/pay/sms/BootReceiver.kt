package com.neext.pay.sms

import android.content.*

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED)) return
        if (!GatewayConfig(context).enabled) return
        DeliveryWorker.periodic(context); DeliveryWorker.schedule(context); GatewayService.start(context)
    }
}