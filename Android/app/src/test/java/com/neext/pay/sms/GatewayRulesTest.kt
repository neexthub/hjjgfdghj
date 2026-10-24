package com.neext.pay.sms
import org.junit.Assert.*
import org.junit.Test

class GatewayRulesTest {
    @Test fun bkashCredit() { assertTrue(GatewayRules.paymentSms("bKash","You have received Tk 250.00 from 01812345678. TrxID ABC123XYZ")) }
    @Test fun nagadCredit() { assertTrue(GatewayRules.paymentSms("NAGAD","Money Received Tk 250.00. Txn ID: ABC123XYZ")) }
    @Test fun upayCredit() { assertTrue(GatewayRules.paymentSms("UPAY","Received BDT 250.00. Transaction ID: ABC123XYZ")) }
    @Test fun rocketCredit() { assertTrue(GatewayRules.paymentSms("DBBL","You received Tk 250.00. TxnId: ABC123XYZ")) }
    @Test fun bkashMerchant() { assertTrue(GatewayRules.paymentSms("bKash","Payment received. Amount Tk 750.00. TrxID 8A6B4C2D0E")) }
    @Test fun nagadMerchant() { assertTrue(GatewayRules.paymentSms("16167","You have received a payment of Tk 1200.00. TxnID: MERCH12345")) }
    @Test fun upayMerchant() { assertTrue(GatewayRules.paymentSms("16793","You have received a merchant payment of Tk 99.00. TxnID: UPMERCH99")) }
    @Test fun rocketMerchant() { assertTrue(GatewayRules.paymentSms("DBBL","You have received a payment Tk 2000.00 in your merchant account. TxnId: 987654321098765")) }
    @Test fun walletMessagesWithoutTrxAreForwarded() { assertTrue(GatewayRules.paymentSms("Nagad","Your account statement is ready")) }
    @Test fun unrelatedMessageIsExcluded() { assertFalse(GatewayRules.paymentSms("Friend","Your OTP is 123456")) }
    @Test fun endpointUsesPublicIngest() { assertEquals("https://pay.example.com/api/public/gateway/ingest",GatewayRules.endpoint("https://pay.example.com")) }
    @Test fun insecureEndpointRejected() { assertThrows(IllegalArgumentException::class.java) { GatewayRules.endpoint("http://pay.example.com") } }
}