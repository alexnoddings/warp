use std::sync::Arc;
use axum::extract::{State};
use axum::response::{Html};
use axum::Router;
use axum::routing::get;
use crate::client::get_html;
use crate::config::Config;

pub fn build_router(cfg: Arc<Config>) -> Router {
    Router::new()
        .route("/", get(client_handler))
        .with_state(cfg)
}

async fn client_handler(State(cfg): State<Arc<Config>>) -> Html<String> {
    let html = get_html(cfg);
    Html(html.parse().unwrap())
}
