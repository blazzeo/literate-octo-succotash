pub fn init_logger() {
    let subscriber = tracing_subscriber::FmtSubscriber::builder()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new(tracing::Level::INFO.to_string())
            }),
        )
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_ansi(true)
        .with_level(true)
        .with_thread_names(true)
        .pretty()
        .finish();

    if let Err(err) = tracing::subscriber::set_global_default(subscriber) {
        tracing::warn!("Logger already initialized: {err}");
    }
}
