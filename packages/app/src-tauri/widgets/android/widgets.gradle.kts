import com.android.build.api.dsl.ApplicationExtension

// Native widget sources live outside Tauri's generated project.
extensions.configure<ApplicationExtension> {
    sourceSets.getByName("main") {
        java.srcDir("../../../widgets/android/src")
        res.srcDir("../../../widgets/android/res")
    }
    buildTypes.getByName("release").proguardFiles(file("../../../widgets/android/proguard.pro"))
}
