plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.neext.pay.sms"
    compileSdk = 35
    defaultConfig { applicationId = "com.neext.pay.sms"; minSdk = 23; targetSdk = 35; versionCode = 2; versionName = "1.1.0" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    testImplementation("junit:junit:4.13.2")
}