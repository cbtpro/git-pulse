#[derive(Default, serde::Serialize)]
pub struct SafeAreaInsets {
    top: f64,
    right: f64,
    bottom: f64,
    left: f64,
}

#[tauri::command]
pub async fn configure_safe_area(window: tauri::WebviewWindow) -> Result<SafeAreaInsets, String> {
    #[cfg(target_os = "ios")]
    {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        window.with_webview(move |webview| {
            // UIKit access stays on the main thread. CSS owns content padding so
            // WKWebView must not retain a second, automatic safe-area inset.
            let insets = unsafe {
                let view = &*webview.inner().cast::<objc2_ui_kit::UIView>();
                let scroll: objc2::rc::Retained<objc2_ui_kit::UIScrollView> =
                    objc2::msg_send![view, scrollView];
                scroll.setContentInsetAdjustmentBehavior(
                    objc2_ui_kit::UIScrollViewContentInsetAdjustmentBehavior::Never,
                );
                scroll.setContentInset(objc2_ui_kit::UIEdgeInsets { top: 0.0, right: 0.0, bottom: 0.0, left: 0.0 });
                view.window().map(|window| window.safeAreaInsets()).unwrap_or_else(|| view.safeAreaInsets())
            };
            let _ = sender.send(SafeAreaInsets {
                top: insets.top,
                right: insets.right,
                bottom: insets.bottom,
                left: insets.left,
            });
        }).map_err(|error| error.to_string())?;
        receiver.await.map_err(|error| error.to_string())
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = window;
        Ok(SafeAreaInsets::default())
    }
}
