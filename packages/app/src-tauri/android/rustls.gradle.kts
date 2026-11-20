// Keep the Kotlin verifier aligned with the Rust dependency, including after
// `tauri android init`. FileContents makes Cargo.lock a configuration-cache input.
val cargoLock = providers.fileContents(layout.projectDirectory.file("../../../Cargo.lock")).asText.get()
val verifierVersion = Regex("name = \"rustls-platform-verifier-android\"\\s+version = \"([^\"]+)\"")
    .find(cargoLock)?.groupValues?.get(1)
    ?: error("rustls-platform-verifier-android is missing from Cargo.lock")

repositories {
    maven {
        url = uri("https://raw.githubusercontent.com/rustls/rustls-platform-verifier/maven-archive/android-release-support/maven/")
        content { includeGroup("org.rustls") }
    }
}

dependencies {
    add("implementation", "org.rustls:rustls-platform-verifier:$verifierVersion")
}

extensions.configure<com.android.build.api.dsl.ApplicationExtension> {
    buildTypes.getByName("release") {
        proguardFiles(file("../../../android/rustls.pro"))
    }
}
