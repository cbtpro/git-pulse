use serde::{Deserialize, Serialize};
#[cfg(target_os = "android")]
use tauri::Manager;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WidgetDay {
    date: String,
    weekday: u8,
    week: u8,
    count: u32,
    level: u8,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WidgetSnapshot {
    version: u8,
    account_id: Option<String>,
    username: Option<String>,
    language: String,
    status: String,
    updated_at: Option<u64>,
    total: u32,
    weeks: u8,
    days: Vec<WidgetDay>,
}
impl WidgetSnapshot {
    fn validate(&self) -> Result<(), String> {
        let valid_date = |s: &str| s.len() == 10 && s.bytes().enumerate().all(|(i, c)| {
            if i == 4 || i == 7 { c == b'-' } else { c.is_ascii_digit() }
        });
        if self.version != 1 || self.weeks > 54 || self.days.len() > 378
            || !["zh-CN", "zh-TW", "en", "ja"].contains(&self.language.as_str())
            || !["ready", "loading", "signedOut", "unavailable"].contains(&self.status.as_str())
            || self.account_id.as_ref().is_some_and(|s| s.is_empty() || s.len() > 100)
            || self.username.as_ref().is_some_and(|s| s.is_empty() || s.len() > 100 || s.chars().any(char::is_control))
            || self.days.iter().any(|d| d.weekday > 6 || d.week >= self.weeks || d.level > 4 || !valid_date(&d.date))
            || (self.status == "ready" && (self.account_id.is_none() || self.username.is_none() || self.updated_at.is_none() || self.weeks == 0))
            || (self.status != "ready" && (!self.days.is_empty() || self.total != 0 || self.weeks != 0 || self.updated_at.is_some()))
            || (self.status == "signedOut" && (self.account_id.is_some() || self.username.is_some()))
        { return Err("Invalid contribution widget snapshot".into()); }
        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetStatus { supported: bool, available: bool, can_pin: bool }

#[cfg(target_os = "android")]
#[derive(Deserialize)]
struct PinResult { accepted: bool }

#[cfg(target_os = "android")]
struct AndroidWidgets(tauri::plugin::PluginHandle<tauri::Wry>);

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::new("contribution-widgets")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            _app.manage(AndroidWidgets(_api.register_android_plugin(
                "com.chenbitao.gitpulse.widgets", "ContributionWidgetPlugin",
            )?));
            Ok(())
        }).build()
}

#[cfg(target_os = "ios")]
fn ios_bridge() -> Option<&'static objc2::runtime::AnyClass> {
    objc2::runtime::AnyClass::get(c"GitPulseWidgetBridge")
}

#[tauri::command]
pub async fn contribution_widget_status(_app: tauri::AppHandle) -> Result<WidgetStatus, String> {
    #[cfg(target_os = "android")]
    return _app.state::<AndroidWidgets>().0.run_mobile_plugin_async("status", ()).await.map_err(|_| "Widget status unavailable".into());
    #[cfg(target_os = "ios")]
    return Ok(WidgetStatus { supported: true, available: ios_bridge().is_some_and(|class| { let available: i32 = unsafe { objc2::msg_send![class, available] }; available == 1 }), can_pin: false });
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    Ok(WidgetStatus { supported: false, available: false, can_pin: false })
}

#[tauri::command]
pub async fn sync_contribution_widget(_app: tauri::AppHandle, snapshot: WidgetSnapshot) -> Result<(), String> {
    snapshot.validate()?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let payload = serde_json::to_string(&snapshot).map_err(|_| "Cannot encode widget snapshot")?;
    #[cfg(target_os = "android")]
    return _app.state::<AndroidWidgets>().0.run_mobile_plugin_async::<()>("update", serde_json::json!({ "payload": payload })).await.map_err(|_| "Cannot update contribution widgets".into());
    #[cfg(target_os = "ios")]
    {
        let class = ios_bridge().ok_or("Widget bridge is unavailable")?;
        let payload = objc2_foundation::NSString::from_str(&payload);
        let status: i32 = unsafe { objc2::msg_send![class, write: &*payload] };
        if status != 0 { return Err("Cannot write widget App Group data".into()); }
    }
    Ok(())
}

#[tauri::command]
pub async fn pin_contribution_widget(_app: tauri::AppHandle, mode: String) -> Result<bool, String> {
    if mode != "2d" && mode != "3d" { return Err("Invalid widget mode".into()); }
    #[cfg(target_os = "android")]
    return _app.state::<AndroidWidgets>().0.run_mobile_plugin_async::<PinResult>("pin", serde_json::json!({ "mode": mode })).await.map(|result| result.accepted).map_err(|_| "Cannot add contribution widget".into());
    #[cfg(not(target_os = "android"))]
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn empty() -> serde_json::Value { serde_json::json!({"version":1,"accountId":null,"username":null,"language":"en","status":"signedOut","updatedAt":null,"total":0,"weeks":0,"days":[]}) }
    #[test]
    fn rejects_credentials_in_widget_payload() {
        let mut value = empty(); value["token"] = "secret".into();
        assert!(serde_json::from_value::<WidgetSnapshot>(value).is_err());
    }
    #[test]
    fn signed_out_cannot_retain_an_account_or_calendar() {
        let value: WidgetSnapshot = serde_json::from_value(empty()).unwrap(); assert!(value.validate().is_ok());
        let mut value = value; value.username = Some("old-account".into()); assert!(value.validate().is_err());
    }
    #[test]
    fn validates_ready_calendar_bounds() {
        let mut json = empty(); json["status"] = "ready".into(); json["accountId"] = "1".into(); json["username"] = "octocat".into(); json["updatedAt"] = 1.into(); json["weeks"] = 1.into();
        json["days"] = serde_json::json!([{"date":"2026-11-21","weekday":6,"week":0,"count":3,"level":2}]);
        let value: WidgetSnapshot = serde_json::from_value(json.clone()).unwrap(); assert!(value.validate().is_ok());
        json["days"][0]["week"] = 54.into();
        assert!(serde_json::from_value::<WidgetSnapshot>(json).unwrap().validate().is_err());
    }
}
