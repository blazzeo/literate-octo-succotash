use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestImage {
    pub id: String,
    pub file: String,
    pub rank: u32,
    #[serde(default)]
    pub main: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub images: Vec<ManifestImage>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DesiredKeep {
    pub id: String,
    pub rank: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DesiredNew {
    #[serde(rename = "tempId")]
    pub temp_id: String,
    pub rank: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DesiredManifest {
    pub keep: Vec<DesiredKeep>,
    pub new: Vec<DesiredNew>,
}
