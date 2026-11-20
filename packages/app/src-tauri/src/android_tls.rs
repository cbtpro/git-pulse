// reqwest 0.13 uses the OS certificate verifier. Android requires both the
// matching Kotlin component (android/rustls.gradle.kts) and a JVM context.
pub fn initialize() -> Result<(), String> {
    let context = ndk_context::android_context();
    // Tao initializes these process-lifetime JVM/application references before
    // starting Tauri. Borrow them on an attached thread; do not delete them.
    let vm = unsafe { jni::JavaVM::from_raw(context.vm().cast()) };
    vm.attach_current_thread(|env| {
        let application = unsafe { jni::objects::JObject::from_raw(env, context.context().cast()) };
        // The verifier retains its own global references and initializes once.
        rustls_platform_verifier::android::init_with_env(env, application)
    })
    .map_err(|_| "无法初始化 GitHub 授权连接".to_string())
}
