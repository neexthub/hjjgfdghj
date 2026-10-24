package com.neext.pay.sms

import java.net.URI

object GatewayRules {
    fun endpoint(raw: String): String {
        val uri = URI(raw.trim())
        require(uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.fragment == null && uri.query == null) { "পূর্ণ HTTPS API URL দিন" }
        val path = uri.path.orEmpty().trimEnd('/')
        require(path.isEmpty() || path == "/api/public/gateway/ingest") { "সাইটের URL অথবা /api/public/gateway/ingest ব্যবহার করুন" }
        return raw.trim().trimEnd('/') + if (path.isEmpty()) "/api/public/gateway/ingest" else ""
    }
    fun validPhone(value: String) = Regex("^(?:\\+?88)?01[3-9][0-9]{8,9}$").matches(value)
    fun paymentSms(sender: String, body: String): Boolean {
        val provider = Regex("bkash|b\\s?kash|nagad|upay|rocket|dbbl|dutch.?bangla|16247|16167|16793|16286", RegexOption.IGNORE_CASE)
        val transaction = Regex("trx\\s*id|txn\\s*id|transaction\\s*id|txid|trx\\s*[:#]|txn\\s*[:#]", RegexOption.IGNORE_CASE)
        return provider.containsMatchIn(sender + " " + body) && transaction.containsMatchIn(body)
    }
}