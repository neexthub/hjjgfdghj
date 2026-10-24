package com.neext.pay.sms

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.widget.*
import androidx.core.app.NotificationManagerCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : Activity() {
    private lateinit var config: GatewayConfig
    private var screen = "dashboard"
    private val listener = android.content.SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> if (screen == "dashboard") runOnUiThread { dashboard() } }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState); config = GatewayConfig(this)
        if (config.configured) dashboard() else setup()
    }
    override fun onResume() { super.onResume(); config.prefs.registerOnSharedPreferenceChangeListener(listener); if (screen == "dashboard") dashboard() else if (screen == "settings") settings() }
    override fun onPause() { config.prefs.unregisterOnSharedPreferenceChangeListener(listener); super.onPause() }
    private fun page(title: String): LinearLayout {
        val scroll = ScrollView(this); val box = GatewayUi.column(this); scroll.addView(box); setContentView(scroll)
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { v, insets -> val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()); v.setPadding(bars.left, bars.top, bars.right, bars.bottom); insets }
        val brand = LinearLayout(this).apply { gravity = android.view.Gravity.CENTER_VERTICAL }
        brand.addView(ImageView(this).apply { setImageResource(R.drawable.neext_symbol); contentDescription = "Neext Pay" }, LinearLayout.LayoutParams(GatewayUi.dp(this,48),GatewayUi.dp(this,48)))
        brand.addView(GatewayUi.text(this,"  Neext Pay",24f,true)); box.addView(brand)
        box.addView(GatewayUi.text(this,title,28f,true)); return box
    }
    private fun setup() {
        screen = "setup"; val box = page("Connect your gateway")
        box.addView(GatewayUi.text(this,"API URL",14f,true))
        val url = GatewayUi.field(this,"https://your-site…",config.endpoint,InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI); box.addView(url)
        box.addView(GatewayUi.text(this,"SMS API key",14f,true))
        val key = GatewayUi.field(this,"npk_…", "",InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD); box.addView(key)
        box.addView(GatewayUi.text(this,"Receiving wallet number",14f,true))
        val phone = GatewayUi.field(this,"01…",config.phone,InputType.TYPE_CLASS_PHONE); box.addView(phone)
        box.addView(GatewayUi.button(this,"Save & continue") {
            try { config.save(url.text.toString(), if (key.text.isBlank() && config.configured) config.apiKey() else key.text.toString().trim(), phone.text.toString().trim()); settings() }
            catch (e: Exception) { AlertDialog.Builder(this).setTitle("Connection settings").setMessage(e.message ?: "Settings could not be saved").setPositiveButton("OK",null).show() }
        })
        if (config.configured) box.addView(GatewayUi.button(this,"Back to dashboard") { dashboard() })
    }
    private fun smsAllowed() = checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
    private fun settings() {
        screen = "settings"; val box = page("Gateway settings")
        box.addView(GatewayUi.text(this,if (smsAllowed()) "✓ SMS permission granted" else "SMS permission required",18f,true))
        box.addView(GatewayUi.button(this,"SMS permission") { if (!smsAllowed()) requestPermissions(arrayOf(Manifest.permission.RECEIVE_SMS),1) else appSettings() })
        val notifications = NotificationManagerCompat.from(this).areNotificationsEnabled()
        box.addView(GatewayUi.text(this,if (notifications) "✓ Status notifications enabled" else "Notifications are disabled"))
        box.addView(GatewayUi.button(this,"Notification settings") {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS),2) else appSettings()
        })
        val exempt = (getSystemService(POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(packageName)
        box.addView(GatewayUi.text(this,if (exempt) "✓ Battery restriction removed" else "Battery restrictions may delay delivery"))
        box.addView(GatewayUi.button(this,"Battery settings") { open(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,Uri.parse("package:$packageName"))) })
        box.addView(GatewayUi.button(this,"Phone background / autostart settings") { appSettings() })
        box.addView(GatewayUi.button(this,"Edit API connection") { setup() })
        box.addView(GatewayUi.button(this,"Open dashboard") { dashboard() })
    }
    private fun dashboard() {
        screen = "dashboard"; val box = page("SMS gateway")
        box.addView(GatewayUi.text(this,if (config.enabled) "● Gateway enabled" else "○ Gateway stopped",20f,true).apply { setTextColor(GatewayUi.primary) })
        box.addView(GatewayUi.text(this,config.phone))
        box.addView(GatewayUi.text(this,"bKash · Nagad · Upay · Rocket",14f))
        val pending = SmsQueue(this).use { it.count() }
        listOf("Received" to config.prefs.getLong("received",0),"Sent" to config.prefs.getLong("sent",0),"Queued" to pending,"Matched payments" to config.prefs.getLong("matched",0)).forEach { (label,count) ->
            box.addView(GatewayUi.text(this,"$count   $label",22f,true))
        }
        box.addView(GatewayUi.text(this,config.prefs.getString("status","SMS-এর অপেক্ষায়").orEmpty()))
        val last = config.prefs.getLong("last_success",0)
        if (last > 0) box.addView(GatewayUi.text(this,"Last delivery: ${java.text.DateFormat.getDateTimeInstance().format(java.util.Date(last))}",13f))
        if (!smsAllowed() || !NotificationManagerCompat.from(this).areNotificationsEnabled()) box.addView(GatewayUi.button(this,"Fix permissions") { settings() })
        box.addView(GatewayUi.button(this,if (config.enabled) "Stop gateway" else "Start gateway") {
            if (config.enabled) { config.enabled = false; DeliveryWorker.cancel(this); stopService(Intent(this,GatewayService::class.java)); dashboard() }
            else if (!smsAllowed()) settings()
            else { config.enabled = true; if (GatewayService.start(this)) { DeliveryWorker.periodic(this); DeliveryWorker.schedule(this) } else config.enabled = false; dashboard() }
        })
        box.addView(GatewayUi.button(this,"Retry queued messages") { if (config.enabled) { DeliveryWorker.schedule(this); Toast.makeText(this,"Delivery scheduled",Toast.LENGTH_SHORT).show() } else Toast.makeText(this,"Start gateway first",Toast.LENGTH_SHORT).show() })
        box.addView(GatewayUi.button(this,"Settings") { settings() })
    }
    private fun appSettings() = open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName")))
    private fun open(intent: Intent) { try { startActivity(intent) } catch (_: Exception) { Toast.makeText(this,"Open your phone's app settings",Toast.LENGTH_LONG).show() } }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode,permissions,grantResults); settings()
        if (grantResults.any { it != PackageManager.PERMISSION_GRANTED }) AlertDialog.Builder(this).setTitle("Permission needed").setMessage("Allow access in app settings to enable this function.").setPositiveButton("Open settings") { _,_ -> appSettings() }.setNegativeButton("Later",null).show()
    }
}