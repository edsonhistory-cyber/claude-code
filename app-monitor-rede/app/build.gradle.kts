plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val numeroBuild = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "com.monitorrede.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.monitorrede.app"
        minSdk = 26
        targetSdk = 34
        versionCode = numeroBuild
        versionName = "1.$numeroBuild"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}
