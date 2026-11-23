import org.gradle.api.GradleException

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val releaseKeystorePath = providers.environmentVariable("SG_ANDROID_KEYSTORE_PATH").orNull
val releaseKeystorePassword = providers.environmentVariable("SG_ANDROID_KEYSTORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("SG_ANDROID_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("SG_ANDROID_KEY_PASSWORD").orNull
val releaseSigningVariables = mapOf(
    "SG_ANDROID_KEYSTORE_PATH" to releaseKeystorePath,
    "SG_ANDROID_KEYSTORE_PASSWORD" to releaseKeystorePassword,
    "SG_ANDROID_KEY_ALIAS" to releaseKeyAlias,
    "SG_ANDROID_KEY_PASSWORD" to releaseKeyPassword,
)
val releaseSigningReady = releaseSigningVariables.values.all { !it.isNullOrBlank() }
val releaseApprovalGranted = providers.environmentVariable("SG_ANDROID_RELEASE_APPROVED").orNull == "true"

android {
    namespace = "com.simplicityglobal.androidengineering"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.simplicityglobal.androidengineering"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("sgRelease") {
            if (releaseSigningReady) {
                storeFile = file(releaseKeystorePath!!)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (releaseSigningReady) {
                signingConfig = signingConfigs.getByName("sgRelease")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

val verifyReleaseSigning by tasks.registering {
    group = "verification"
    description = "Fails closed unless release secrets, keystore, and per-release approval are present."
    doLast {
        if (!releaseSigningReady) {
            val missing = releaseSigningVariables.filterValues { it.isNullOrBlank() }.keys
            throw GradleException("Release signing blocked. Configure these variables in a secure secret store: ${missing.joinToString()}")
        }
        if (!releaseApprovalGranted) {
            throw GradleException("Release signing blocked. Set SG_ANDROID_RELEASE_APPROVED=true only after explicit operator approval.")
        }
        val keystore = file(releaseKeystorePath!!)
        if (!keystore.isFile) {
            throw GradleException("Release signing blocked: configured keystore file does not exist.")
        }
    }
}

tasks.configureEach {
    if (name == "assembleRelease" || name == "bundleRelease") {
        dependsOn(verifyReleaseSigning)
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.core:core-ktx:1.15.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}
