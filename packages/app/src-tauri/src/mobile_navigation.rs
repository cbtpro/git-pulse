/// WKWebView owns interactive edge gestures and navigation history. React Router
/// receives popstate and restores retained page state after a completed gesture.
#[cfg(target_os = "ios")]
fn set_gestures<R: tauri::Runtime>(webview: &tauri::Webview<R>, enabled: bool) -> tauri::Result<()> {
    webview.with_webview(move |native| unsafe {
        let view = &*native.inner().cast::<objc2::runtime::AnyObject>();
        let _: () = objc2::msg_send![view, setAllowsBackForwardNavigationGestures: enabled];
    })
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("mobile-navigation")
        .on_webview_ready(|_webview| {
            #[cfg(target_os = "ios")]
            if let Err(error) = set_gestures(&_webview, true) {
                eprintln!("Unable to enable native navigation gestures: {error}");
            }
        })
        .build()
}

/// A modal must not allow a swipe to navigate the page underneath it.
#[tauri::command]
pub fn set_navigation_gestures(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "ios")]
    return set_gestures(window.as_ref(), enabled).map_err(|error| error.to_string());
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (window, enabled);
        Ok(())
    }
}
