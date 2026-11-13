use axum::{Json, Router, http::StatusCode, response::IntoResponse, routing::get};
use serde::Serialize;
use std::process::Command;
use tokio::sync::OnceCell;

#[derive(Serialize)]
struct ContractAddressResponse {
    address: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    details: Option<String>,
}

#[derive(Debug)]
enum AppError {
    DeployError(String),
    IoError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg, details) = match self {
            AppError::DeployError(details) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Contract deployment failed".to_string(),
                Some(details),
            ),
            AppError::IoError(details) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal I/O error".to_string(),
                Some(details),
            ),
        };

        let body = Json(ErrorResponse {
            error: msg,
            details,
        });

        (status, body).into_response()
    }
}

// Global OnceCell to store deployment address after first deployment
static VENDOR_FABRIC_ADDR: OnceCell<String> = OnceCell::const_new();

// Deploy the VendorFabric contract via `forge create` and parse stdout
async fn deploy_vendor_fabric() -> Result<String, AppError> {
    if let Some(addr) = VENDOR_FABRIC_ADDR.get() {
        return Ok(addr.clone());
    }

    let output = Command::new("forge")
        .args([
            "create",
            "src/vendor_fabric.sol:VendorFabric",
            "--rpc-url",
            "http://localhost:8545",
            "--private-key",
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            "--broadcast",
        ])
        .output()
        .map_err(|e| AppError::IoError(format!("Failed to start forge: {e}")))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    println!("=== forge stdout ===\n{stdout}");
    eprintln!("=== forge stderr ===\n{stderr}");

    if !output.status.success() {
        return Err(AppError::DeployError(format!(
            "forge exited with code {:?}\nstdout:\n{}\nstderr:\n{}",
            output.status.code(),
            stdout,
            stderr
        )));
    }

    for line in stdout.lines() {
        if let Some(addr) = line.strip_prefix("Deployed to: ") {
            let addr = addr.split_whitespace().next().unwrap().to_string();
            VENDOR_FABRIC_ADDR.set(addr.clone()).ok();
            return Ok(addr);
        }
    }

    Err(AppError::DeployError(format!(
        "Could not parse contract address from forge output.\nstdout:\n{}\nstderr:\n{}",
        stdout, stderr
    )))
}

// API endpoint
async fn contract_address() -> Result<Json<ContractAddressResponse>, AppError> {
    let address = deploy_vendor_fabric().await?;
    Ok(Json(ContractAddressResponse { address }))
}

// Simple health-check
async fn health_check() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "3007".to_string());

    let app = Router::new()
        .route("/api/address", get(contract_address))
        .route("/health", get(health_check));

    tracing::info!("🚀 Server running at http://{}:{}/", host, port);

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
