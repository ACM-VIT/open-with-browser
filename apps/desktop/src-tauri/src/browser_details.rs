use crowser::{browser};
use std::{fs, path::PathBuf, io::{self, Read}};
use dirs::{config_dir, data_local_dir};
use serde_json::Value;

pub fn get_browsers() -> Vec<String> {
    let browser_vector = browser::get_all_existing_browsers();
    let browser_names: Vec<String> = browser_vector.iter().map(|s| s.name.to_owned()).collect();

    return browser_names;
}

pub fn get_chrome_profiles() -> Result<Vec<String>, Box<dyn std::error::Error>> {

    let base_dir = if cfg!(target_os = "windows") || cfg!(target_os = "macos") {
            data_local_dir()
        } else {
            config_dir()
    };

    if let Some(mut path) = base_dir {

        #[cfg(target_os = "windows")]
        path.push("Google\\Chrome\\User Data\\Local State"); 
        
        #[cfg(target_os = "macos")]
        path.push("Google/Chrome/Local State");

        #[cfg(target_os = "linux")]
        path.push("google-chrome/Local State");

        if path.exists() {

            let mut file = fs::File::open(path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;

            let json_value: Value = serde_json::from_str(&contents)?;

            let info_cache = json_value
                .get("profile")
                .and_then(|p| p.get("info_cache"))
                .and_then(|ic| ic.as_object())
                .ok_or_else(|| "Could not find 'profile' or 'info_cache' in JSON.")?;

            let mut profile_names: Vec<String> = Vec::new();

            for (_profile_key, profile_data) in info_cache.iter() {
                if let Some(name_value) = profile_data.get("gaia_name") {
                    if let Some(name_str) = name_value.as_str() {
                        profile_names.push(name_str.to_owned());
                    }
                }
            }

            return Ok(profile_names);

        }
    }

    Ok(Vec::new())
}    