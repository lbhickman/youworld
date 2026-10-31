use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Only simple file names are allowed inside the app's data folder.
fn safe_name(name: &str) -> Result<(), String> {
    let ok = !name.is_empty()
        && name.len() < 200
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !name.starts_with('.');
    if ok {
        Ok(())
    } else {
        Err(format!("invalid data file name: {name}"))
    }
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Reads a JSON data file from the app data folder. Returns None if it doesn't exist.
#[tauri::command]
fn read_data(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    safe_name(&name)?;
    let path = data_dir(&app)?.join(&name);
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

/// Writes a data file atomically (write to temp file, then rename).
#[tauri::command]
fn write_data(app: tauri::AppHandle, name: String, contents: String) -> Result<(), String> {
    safe_name(&name)?;
    let dir = data_dir(&app)?;
    let tmp = dir.join(format!("{name}.tmp"));
    let path = dir.join(&name);
    fs::write(&tmp, contents).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_data(app: tauri::AppHandle, name: String) -> Result<(), String> {
    safe_name(&name)?;
    let path = data_dir(&app)?.join(&name);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Writes a text file to a path the user picked in a Save dialog.
#[tauri::command]
fn save_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

/// Opens the folder where YouWorld keeps its data (for manual backups).
#[tauri::command]
fn data_dir_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(data_dir(&app)?.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_data,
            write_data,
            delete_data,
            save_text_file,
            data_dir_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running YouWorld");
}
