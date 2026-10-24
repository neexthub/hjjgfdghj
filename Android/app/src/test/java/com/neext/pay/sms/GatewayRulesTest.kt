package com.neext.pay.sms
import org.junit.Assert.*
import org.junit.Test

class GatewayRulesTest {
    @Test fun bkashCredit() { assertTrue(GatewayRules.paymentSms("bKash","You have received Tk 250.00 from 01812345678. TrxID ABC123XYZ")) }
    @Test fun nagadCredit() { assertTrue(GatewayRules.paymentSms("NAGAD","Money Received Tk 250.00. Txn ID: ABC123XYZ")) }
    @Test fun upayCredit() { assertTrue(GatewayRules.paymentSms("UPAY","Received BDT 250.00. Transaction ID: ABC123XYZ")) }
    @Test fun rocketCredit() { assertTrue(GatewayRules.paymentSms("DBBL","You received Tk 250.00. TxnId: ABC123XYZ")) }
    @Test fun unrelatedMessageIsExcluded() { assertFalse(GatewayRules.paymentSms("Friend","Your OTP is 123456")) }
    @Test fun endpointUsesPublicIngest() { assertEquals("https://pay.example.com/api/public/gateway/ingest",GatewayRules.endpoint("https://pay.example.com")) }
    @Test fun insecureEndpointRejected() { assertThrows(IllegalArgumentException::class.java) { GatewayRules.endpoint("http://pay.example.com") } }
}