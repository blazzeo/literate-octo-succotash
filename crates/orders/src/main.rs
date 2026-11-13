use orders::{init::init_app_state, router::create_app};
use tracing_logger::init_logger;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    init_logger();
    let app_state = init_app_state().await;

    let _ = create_app(app_state.clone()).await;

    Ok(())
}
