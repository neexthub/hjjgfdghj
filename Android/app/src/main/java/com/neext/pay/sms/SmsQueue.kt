package com.neext.pay.sms

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.security.MessageDigest

data class QueuedSms(val id: Long, val sender: String, val body: String, val receivedAt: String)
class SmsQueue(context: Context) : SQLiteOpenHelper(context, "sms_queue.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE queue (id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT UNIQUE NOT NULL, sender TEXT NOT NULL, body TEXT NOT NULL, received_at TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    fun add(sender: String, body: String, at: String): Boolean {
        val hash = MessageDigest.getInstance("SHA-256").digest("$sender|$body|$at".toByteArray()).joinToString("") { "%02x".format(it) }
        val values = android.content.ContentValues().apply { put("fingerprint", hash); put("sender", sender); put("body", body); put("received_at", at) }
        return writableDatabase.insertWithOnConflict("queue", null, values, SQLiteDatabase.CONFLICT_IGNORE) != -1L
    }
    fun batch(): List<QueuedSms> = readableDatabase.rawQuery("SELECT id,sender,body,received_at FROM queue ORDER BY id LIMIT 50", null).use { c ->
        buildList { while (c.moveToNext()) add(QueuedSms(c.getLong(0), c.getString(1), c.getString(2), c.getString(3))) }
    }
    fun count(): Long = readableDatabase.rawQuery("SELECT COUNT(*) FROM queue", null).use { it.moveToFirst(); it.getLong(0) }
    fun acknowledge(rows: List<QueuedSms>) { if (rows.isNotEmpty()) writableDatabase.delete("queue", "id IN (${rows.joinToString(",") { "?" }})", rows.map { it.id.toString() }.toTypedArray()) }
}