use axum::{
    body::{Body, Bytes},
    extract::{Multipart, multipart::Field},
    http::header,
    response::Response,
};
use image::ImageFormat;
use service_error::ServiceError;
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File},
    io::BufWriter,
    path::PathBuf,
};

use crate::types::{DesiredManifest, Manifest, ManifestImage};

fn manifest_path(base_dir: &str) -> String {
    format!("{}/manifest.json", base_dir)
}

fn load_or_default_manifest(base_dir: &str) -> Result<Manifest, ServiceError> {
    let path = manifest_path(base_dir);
    let p = PathBuf::from(&path);
    if p.exists() {
        let text = fs::read_to_string(&p).map_err(|e| ServiceError::Internal(e.to_string()))?;
        let mut m: Manifest = serde_json::from_str(&text)
            .map_err(|_| ServiceError::Internal("manifest parse".into()))?;
        m.images.sort_by_key(|i| i.rank);
        Ok(m)
    } else {
        // Initialization from existing files (w/o previous id)
        let mut images = vec![];
        let mut files: Vec<String> = vec![];
        for entry in fs::read_dir(base_dir).map_err(|e| ServiceError::Internal(e.to_string()))? {
            let entry = entry.map_err(|_| ServiceError::Internal("Invalid file".into()))?;
            let name = entry
                .file_name()
                .into_string()
                .map_err(|_| ServiceError::Internal("Invalid name".into()))?;
            if name.ends_with(".jpg") && name != "main.jpg" {
                files.push(name);
            }
        }
        files.sort();
        for (idx, file) in files.into_iter().enumerate() {
            let id = uuid::Uuid::new_v4().to_string();
            images.push(ManifestImage {
                id,
                file,
                rank: (idx as u32) + 1,
                main: idx == 0,
            });
        }
        Ok(Manifest {
            images,
            updated_at: chrono::Utc::now().to_rfc3339(),
        })
    }
}

fn write_manifest(
    base_dir: &str,
    images: &[ManifestImage],
) -> Result<(), ServiceError> {
    let m = Manifest {
        images: images.to_vec(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    let text =
        serde_json::to_string_pretty(&m).map_err(|e| ServiceError::Internal(e.to_string()))?;
    fs::write(manifest_path(base_dir), text).map_err(|e| ServiceError::Internal(e.to_string()))
}

pub async fn upload_file(
    static_dir_path: &str,
    file_path: String,
    user_id: String,
    mut multipart: Multipart,
) -> Result<(), ServiceError> {
    let mut uploads: Vec<(Vec<u8>, ImageFormat)> = vec![];

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ServiceError::BadRequest)?
    {
        if file_path.contains("avatar") {
            let bytes = field
                .bytes()
                .await
                .map_err(|_| ServiceError::Conflict)?
                .to_vec();
            let format = image::guess_format(&bytes).map_err(|_| ServiceError::BadRequest)?;
            save_avatar(static_dir_path, &user_id, &bytes, format)?;
            continue;
        }

        let file_bytes = collect_bytes(field).await?;
        let format = image::guess_format(&file_bytes).map_err(|_| ServiceError::BadRequest)?;
        uploads.push((file_bytes, format));
    }

    if file_path.contains("avatar") {
        return Ok(());
    }

    let base_dir = format!("{}/goods/{}", static_dir_path, file_path);
    fs::create_dir_all(&base_dir).map_err(|e| ServiceError::Internal(e.to_string()))?;

    let mut manifest = load_or_default_manifest(&base_dir)?;
    manifest.images.sort_by_key(|i| i.rank);

    let mut next_rank: u32 = manifest.images.iter().map(|i| i.rank).max().unwrap_or(0) + 1;

    for (bytes, fmt) in uploads {
        let id = uuid::Uuid::new_v4().to_string();
        let file = format!("{:03}_{}.jpg", next_rank, id);
        save_as_jpeg(&format!("{}/{}", base_dir, file), &bytes, fmt)?;
        manifest.images.push(ManifestImage {
            id,
            file,
            rank: next_rank,
            main: false,
        });
        next_rank += 1;
    }

    manifest.images.sort_by_key(|i| i.rank);
    for (idx, img) in manifest.images.iter_mut().enumerate() {
        img.main = idx == 0;
    }
    write_manifest(&base_dir, &manifest.images)?;

    if let Some(first) = manifest.images.first() {
        rebuild_main_copy(&base_dir, &first.file)?;
    }

    Ok(())
}

async fn collect_bytes(field: Field<'_>) -> Result<Vec<u8>, ServiceError> {
    let bytes = field.bytes().await.map_err(|_| ServiceError::Conflict)?;
    Ok(bytes.to_vec())
}

fn save_avatar(
    static_dir: &str,
    user_id: &str,
    file_bytes: &[u8],
    format: ImageFormat,
) -> Result<(), ServiceError> {
    let path = format!("{}/avatars", static_dir);
    fs::create_dir_all(&path).map_err(|e| ServiceError::Internal(e.to_string()))?;

    let file_path = format!("{}/{}.jpg", path, user_id);
    overwrite_file(&file_path)?;

    save_as_jpeg(&file_path, file_bytes, format)
}

fn overwrite_file(path: &str) -> Result<(), ServiceError> {
    if PathBuf::from(path).exists() {
        fs::remove_file(path).map_err(|e| ServiceError::Internal(e.to_string()))?;
    }
    Ok(())
}

fn save_as_jpeg(
    path: &str,
    file_bytes: &[u8],
    format: ImageFormat,
) -> Result<(), ServiceError> {
    match format {
        ImageFormat::Png => {
            let img = image::load_from_memory_with_format(file_bytes, ImageFormat::Png)
                .map_err(|_| ServiceError::BadRequest)?;
            let output = File::create(path).map_err(|e| ServiceError::Internal(e.to_string()))?;
            let mut writer = BufWriter::new(output);
            img.to_rgb8()
                .write_to(&mut writer, ImageFormat::Jpeg)
                .map_err(|e| ServiceError::Internal(e.to_string()))?;
        },
        ImageFormat::Jpeg => {
            fs::write(path, file_bytes).map_err(|e| ServiceError::Internal(e.to_string()))?;
        },
        _ => return Err(ServiceError::Internal("Image format not supported".into())),
    }
    Ok(())
}

pub async fn read_file(
    static_dir_path: &str,
    file_path: String,
) -> Result<Response, ServiceError> {
    let path = PathBuf::from(format!("{}/{}", static_dir_path, file_path));

    match fs::read(&path) {
        Ok(image_bytes) => {
            let body = Body::from(Bytes::from(image_bytes));
            let res = Response::builder()
                .status(200)
                .header(header::CONTENT_TYPE, "image/jpeg")
                .body(body)
                .unwrap();
            Ok(res)
        },
        Err(_) => Err(ServiceError::NotFound("Image not found".into())),
    }
}

pub async fn delete_file(
    static_dir_path: &str,
    file_path: String,
) -> Result<(), ServiceError> {
    let path = PathBuf::from(format!("{}/{}", static_dir_path, file_path));

    if !path.exists() {
        return Err(ServiceError::NotFound("File not found".into()));
    }

    fs::remove_file(path)
        .map_err(|e| ServiceError::Internal(format!("Failed to delete file: {}", e)))?;

    Ok(())
}

pub async fn get_manifest(
    static_dir_path: &str,
    file_path: String,
) -> Result<String, ServiceError> {
    let path = PathBuf::from(format!(
        "{}/goods/{}/manifest.json",
        static_dir_path, file_path
    ));

    if !path.exists() {
        return Err(ServiceError::Conflict);
    }

    let file = std::fs::read_to_string(path).map_err(|_| ServiceError::Conflict)?;

    Ok(file)
}

//  Main.jpg is needed for CONST Front Image.
//  Example: get main image w/o manifest on GoodsList component
fn rebuild_main_copy(
    base_dir: &str,
    first_file: &str,
) -> Result<(), ServiceError> {
    let from = format!("{}/{}", base_dir, first_file);
    let to = format!("{}/main.jpg", base_dir);
    let _ = overwrite_file(&to);
    fs::copy(from, to).map_err(|e| ServiceError::Internal(e.to_string()))?;
    Ok(())
}

pub async fn update_files(
    static_dir_path: &str,
    file_path: String,
    mut multipart: Multipart,
) -> Result<(), ServiceError> {
    let base_dir = format!("{}/goods/{}", static_dir_path, file_path);
    fs::create_dir_all(&base_dir).map_err(|e| ServiceError::Internal(e.to_string()))?;

    let mut manifest_json: Option<String> = None;
    let mut uploads: Vec<(String, Vec<u8>, ImageFormat)> = vec![];

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ServiceError::BadRequest)?
    {
        let name = field
            .name()
            .map(|s| s.to_string())
            .ok_or(ServiceError::BadRequest)?;

        if name == "manifest" {
            let bytes = field
                .bytes()
                .await
                .map_err(|_| ServiceError::BadRequest)?
                .to_vec();
            manifest_json = Some(String::from_utf8(bytes).map_err(|_| ServiceError::BadRequest)?);
        } else if let Some(temp_id) = name.strip_prefix("file:") {
            let bytes = field
                .bytes()
                .await
                .map_err(|_| ServiceError::Conflict)?
                .to_vec();
            let fmt = image::guess_format(&bytes).map_err(|_| ServiceError::BadRequest)?;
            uploads.push((temp_id.to_string(), bytes, fmt));
        }
    }

    let desired: DesiredManifest =
        serde_json::from_str(&manifest_json.ok_or(ServiceError::BadRequest)?)
            .map_err(|_| ServiceError::BadRequest)?;

    let current = load_or_default_manifest(&base_dir)?;

    // Indexing
    let mut by_id: HashMap<String, ManifestImage> = current
        .images
        .into_iter()
        .map(|img| (img.id.clone(), img))
        .collect();

    // Deleting
    let desired_keep_ids: HashSet<&str> = desired.keep.iter().map(|k| k.id.as_str()).collect();
    let to_delete: Vec<String> = by_id
        .keys()
        .filter(|&id| !desired_keep_ids.contains(id.as_str()))
        .cloned()
        .collect();
    for id in to_delete {
        if let Some(img) = by_id.remove(&id) {
            let path = format!("{}/{}", base_dir, img.file);
            if PathBuf::from(&path).exists() {
                fs::remove_file(&path)
                    .map_err(|e| ServiceError::Internal(format!("Failed to delete file: {}", e)))?;
            }
        }
    }

    // New (map by tempId)
    let up_map: HashMap<String, (Vec<u8>, ImageFormat)> =
        uploads.into_iter().map(|(t, b, f)| (t, (b, f))).collect();
    for n in &desired.new {
        let (bytes, fmt) = up_map
            .get(&n.temp_id)
            .ok_or(ServiceError::BadRequest)?
            .clone();
        let id = uuid::Uuid::new_v4().to_string();
        let file = format!("{:03}_{}.jpg", n.rank, id);
        let full_path = format!("{}/{}", base_dir, file);
        save_as_jpeg(&full_path, &bytes, fmt)?;
        by_id.insert(
            id.clone(),
            ManifestImage {
                id,
                file,
                rank: n.rank,
                main: false,
            },
        );
    }

    // Rearrange/rename for keep
    for k in &desired.keep {
        if let Some(img) = by_id.get_mut(&k.id) {
            if img.rank != k.rank {
                let new_file = format!("{:03}_{}.jpg", k.rank, img.id);
                fs::rename(
                    format!("{}/{}", base_dir, img.file),
                    format!("{}/{}", base_dir, &new_file),
                )
                .map_err(|e| ServiceError::Internal(e.to_string()))?;
                img.rank = k.rank;
                img.file = new_file;
            } else {
                // Format file_name
                let expected = format!("{:03}_{}.jpg", k.rank, img.id);
                if img.file != expected {
                    let old = format!("{}/{}", base_dir, img.file);
                    let newp = format!("{}/{}", base_dir, expected);
                    if PathBuf::from(&old).exists() {
                        fs::rename(old, newp).map_err(|e| ServiceError::Internal(e.to_string()))?;
                        img.file = expected;
                    }
                }
            }
        } else {
            tracing::error!("keep id not found in manifest: {}", k.id);
            return Err(ServiceError::BadRequest);
        }
    }

    // Rewrite manifest
    let mut images: Vec<ManifestImage> = by_id.into_values().collect();
    images.sort_by_key(|i| i.rank);
    for (idx, img) in images.iter_mut().enumerate() {
        img.main = idx == 0;
    }
    write_manifest(&base_dir, &images)?;

    if let Some(first) = images.first() {
        rebuild_main_copy(&base_dir, &first.file)?;
    }

    Ok(())
}
