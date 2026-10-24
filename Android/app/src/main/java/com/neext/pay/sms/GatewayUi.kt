package com.neext.pay.sms

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.widget.*

object GatewayUi {
    val primary = Color.rgb(0, 110, 88)
    val ink = Color.rgb(20, 37, 34)
    val surface = Color.rgb(243, 247, 246)
    val muted = Color.rgb(87, 107, 101)
    val error = Color.rgb(179, 38, 30)
    fun dp(c: Context, n: Int) = (n * c.resources.displayMetrics.density).toInt()
    fun text(c: Context, value: String, size: Float = 16f, bold: Boolean = false) = TextView(c).apply {
        text = value; textSize = size; setTextColor(ink)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, dp(c, 8), 0, dp(c, 8))
    }
    fun background(color: Int, c: Context) = GradientDrawable().apply { setColor(color); cornerRadius = dp(c, 8).toFloat() }
    fun button(c: Context, label: String, action: () -> Unit) = Button(c).apply {
        text = label; isAllCaps = false; setTextColor(Color.WHITE); background = background(primary, c)
        layoutParams = LinearLayout.LayoutParams(-1, dp(c, 52)).apply { topMargin = dp(c, 12) }
        setOnClickListener { action() }
    }
    fun column(c: Context) = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(c,24),dp(c,20),dp(c,24),dp(c,32)); setBackgroundColor(surface) }
    fun field(c: Context, hintText: String, value: String, type: Int) = EditText(c).apply {
        hint = hintText; setText(value); inputType = type; setSingleLine(true); setTextColor(ink); setHintTextColor(muted)
        layoutParams = LinearLayout.LayoutParams(-1, dp(c, 60)); importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
    }
}