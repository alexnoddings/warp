use std::sync::Arc;
use crate::config::Config;

pub fn get_js(cfg: Arc<Config>) -> String {
    let js = cfg.to_javascript();
    format!("window.warpTargets={js}")
}

pub fn get_html(cfg: Arc<Config>) -> String {
    let html = include_str!("../dist/index.html");
    let js = get_js(cfg);
    html.replace("window.warpTargets=[]", &js)
}
