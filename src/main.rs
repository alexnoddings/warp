use std::sync::Arc;
use tokio::signal;

mod config;
mod router;
mod client;

#[tokio::main]
async fn main() {
    let cfg = config::load_config().await;
    let address = cfg.address.clone();
    let cfg = Arc::new(cfg);

    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .expect("failed to bind to address");
    let router = router::build_router(cfg);

    println!("Now listening on: {address}");
    println!("Application started. Press Ctrl+C to shut down.");

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Error running server");

    println!("Application is shutting down...");
}

async fn shutdown_signal() {
    tokio::select! {
        _ = await_ctrl_c() => {},
        _ = await_terminate() => {},
    }
}

async fn await_ctrl_c() {
    signal::ctrl_c().await.unwrap()
}

#[cfg(unix)]
async fn await_terminate() {
    let terminate = signal::unix::SignalKind::terminate();
    signal::unix::signal(terminate).unwrap().recv().await;
}

#[cfg(not(unix))]
async fn await_terminate() {
    // No non-unix implementation
    std::future::pending::<()>().await;
}