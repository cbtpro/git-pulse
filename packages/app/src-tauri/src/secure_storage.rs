use aes_gcm::{Aes256Gcm, KeyInit, Nonce, aead::{Aead, Payload, OsRng, rand_core::RngCore}};
use std::{fs, io::Write, path::{Path, PathBuf}, sync::Mutex};
use tauri::Manager;
use zeroize::Zeroizing;

static VAULT_LOCK: Mutex<()> = Mutex::new(());
const AAD: &[u8] = b"gitpulse/auth-vault/v1";
const MAGIC: &[u8] = b"GPV1";
// Credentials and account-scoped workspace data share the encrypted vault.
const MAX_SIZE: usize = 16 * 1_048_576;

fn entry() -> Result<keyring::Entry, String> {
    if !cfg!(any(target_os = "ios", target_os = "macos", target_os = "windows", target_os = "linux")) {
        return Err("当前平台不支持安全存储".into());
    }
    keyring::Entry::new("com.chenbitao.gitpulse", "auth-vault-master-key")
        .map_err(|_| "无法访问系统安全存储，请稍后重试".into())
}

fn master_key(create: bool) -> Result<Zeroizing<Vec<u8>>, String> {
    let entry = entry()?;
    let secret = match entry.get_secret() {
        Ok(secret) => secret,
        Err(keyring::Error::NoEntry) if create => {
            let mut key = vec![0u8; 32];
            OsRng.fill_bytes(&mut key);
            entry.set_secret(&key).map_err(|_| "无法保存加密密钥，请检查系统安全存储权限")?;
            key
        }
        Err(_) => return Err("无法读取加密密钥，请检查系统安全存储权限".into()),
    };
    if secret.len() != 32 { return Err("加密密钥无效，无法读取账号数据".into()); }
    Ok(Zeroizing::new(secret))
}

fn seal(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| "加密密钥无效")?;
    let mut nonce = [0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce), Payload { msg: plaintext, aad: AAD })
        .map_err(|_| "账号数据加密失败")?;
    Ok([MAGIC, &nonce, &ciphertext].concat())
}

fn unseal(key: &[u8], data: &[u8]) -> Result<String, String> {
    if data.len() < 32 || !data.starts_with(MAGIC) { return Err("加密账号数据已损坏，无法读取".into()); }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| "加密密钥无效")?;
    let plaintext = cipher.decrypt(Nonce::from_slice(&data[4..16]), Payload { msg: &data[16..], aad: AAD })
        .map_err(|_| "加密账号数据校验失败，无法读取")?;
    String::from_utf8(plaintext).map_err(|_| "加密账号数据格式无效".into())
}

fn read_vault(path: &Path) -> Result<Option<String>, String> {
    let _guard = VAULT_LOCK.lock().map_err(|_| "安全存储暂不可用")?;
    read_vault_unlocked(path)
}
fn read_vault_unlocked(path: &Path) -> Result<Option<String>, String> {
    if !path.exists() { return Ok(None); }
    if fs::metadata(path).map_err(|_| "无法读取加密账号数据")?.len() > (MAX_SIZE + 32) as u64 {
        return Err("加密账号数据大小异常".into());
    }
    let data = fs::read(path).map_err(|_| "无法读取加密账号数据")?;
    unseal(&master_key(false)?, &data).map(Some)
}

fn write_vault(path: &Path, value: &str) -> Result<(), String> {
    let _guard = VAULT_LOCK.lock().map_err(|_| "安全存储暂不可用")?;
    write_vault_unlocked(path, value)
}
fn write_vault_unlocked(path: &Path, value: &str) -> Result<(), String> {
    if value.len() > MAX_SIZE || serde_json::from_str::<serde_json::Value>(value).is_err() {
        return Err("账号数据格式无效".into());
    }
    let encrypted = seal(&master_key(true)?, value.as_bytes())?;
    let parent = path.parent().ok_or("安全存储路径无效")?;
    fs::create_dir_all(parent).map_err(|_| "无法创建安全存储目录")?;
    let temporary = path.with_extension("pending");
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let result = (|| {
        let mut file = options.open(&temporary).map_err(|_| "无法保存加密账号数据")?;
        file.write_all(&encrypted).map_err(|_| "无法保存加密账号数据")?;
        file.sync_all().map_err(|_| "无法保存加密账号数据")?;
        fs::rename(&temporary, path).map_err(|_| "无法完成账号数据保存")
    })();
    if result.is_err() { let _ = fs::remove_file(&temporary); }
    result.map_err(String::from)
}

fn clear_vault(path: &Path) -> Result<(), String> {
    let _guard = VAULT_LOCK.lock().map_err(|_| "安全存储暂不可用")?;
    clear_vault_unlocked(path)
}
fn clear_vault_unlocked(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => (),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
        Err(_) => return Err("无法清除加密账号数据，请重试".into()),
    }
    let _ = fs::remove_file(path.with_extension("pending"));
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("无法清除加密密钥，请重试".into()),
    }
}

fn vault_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map(|dir| dir.join("accounts.vault"))
        .map_err(|_| "无法打开安全存储目录".into())
}

#[tauri::command]
pub async fn read_auth_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = vault_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || read_vault(&path)).await.map_err(|_| "安全存储暂不可用")?
}
#[tauri::command]
pub async fn write_auth_vault(app: tauri::AppHandle, value: String) -> Result<(), String> {
    let path = vault_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || write_vault(&path, &value)).await.map_err(|_| "安全存储暂不可用")?
}
#[tauri::command]
pub async fn clear_auth_vault(app: tauri::AppHandle) -> Result<(), String> {
    let path = vault_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || clear_vault(&path)).await.map_err(|_| "安全存储暂不可用")?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn authenticated_encryption_uses_fresh_nonces_and_rejects_tampering() {
        let key = [42u8; 32];
        let secret = br#"{"token":"fixture-secret","profile":{"login":"example"}}"#;
        let first = seal(&key, secret).unwrap();
        let mut second = seal(&key, secret).unwrap();
        assert_ne!(first, second);
        assert!(!first.windows(14).any(|bytes| bytes == b"fixture-secret"));
        assert_eq!(unseal(&key, &first).unwrap().as_bytes(), secret);
        second[20] ^= 1;
        assert!(unseal(&key, &second).is_err());
        assert!(unseal(&[0u8; 32], &first).is_err());
    }
}

/// Atomic compare-and-swap for read/modify/write across WebView callers.
#[tauri::command]
pub async fn compare_auth_vault(app: tauri::AppHandle, expected: Option<String>, value: Option<String>) -> Result<bool, String> {
    let path = vault_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = VAULT_LOCK.lock().map_err(|_| "安全存储暂不可用")?;
        if read_vault_unlocked(&path)? != expected { return Ok(false); }
        match value { Some(value) => write_vault_unlocked(&path, &value)?, None => clear_vault_unlocked(&path)? }
        Ok(true)
    }).await.map_err(|_| "安全存储暂不可用")?
}
