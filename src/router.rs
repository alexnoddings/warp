use std::sync::Arc;
use axum::extract::{Path, State};
use axum::http::{header, StatusCode};
use axum::response::{Html, IntoResponse, Response};
use axum::Router;
use axum::routing::get;
use crate::client::{get_favicon, get_html};
use crate::config::Config;

pub fn build_router(cfg: Arc<Config>) -> Router {
    Router::new()
        .route("/", get(client_handler))
        .route("/favicon.svg", get(favicon_handler))
        .route("/go/{*slug}", get(redirect_handler))
        .with_state(cfg)
}

async fn client_handler(State(cfg): State<Arc<Config>>) -> Html<String> {
    let html = get_html(cfg);
    Html(html.parse().unwrap())
}

async fn favicon_handler() -> Response {
    let headers = [(header::CONTENT_TYPE, "image/svg+xml")];
    (StatusCode::OK, headers, get_favicon()).into_response()
}

async fn redirect_handler(State(cfg): State<Arc<Config>>, Path(slug): Path<String>) -> Response {
    match cfg.get_target(&slug) {
        None => StatusCode::NOT_FOUND.into_response(),
        Some(target) => {
            let headers = [(header::LOCATION, &target.url)];
            (StatusCode::FOUND, headers).into_response()
        }
    }
}
