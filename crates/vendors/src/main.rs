use tracing_logger::init_logger;
use vendors::{init::init_app_state, router::create_app};

#[tokio::main]
async fn main() -> std::io::Result<()> {
    init_logger();
    let app_state = init_app_state().await;

    let _ = create_app(app_state.clone()).await;

    Ok(())
}
