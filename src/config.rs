use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Config {
    #[serde(default = "address_default")]
    pub address: String,

    #[serde(default)]
    pub targets: Vec<Target>,
}

#[derive(Serialize, Deserialize)]
pub struct Target {
    #[serde(default)]
    pub id: String,

    #[serde(default)]
    pub host: String,

    #[serde(default)]
    pub title: String,

    #[serde(default)]
    pub url: String,
}

fn address_default() -> String {
    "localhost:8080".to_string()
}

impl Config {
    pub fn to_javascript(&self) -> String {
        serde_json::to_string::<Vec<Target>>(&self.targets).unwrap()
    }

    pub fn get_target(&self, id: &str) -> Option<&Target> {
        self.targets.iter().find(|&target| target.id == id)
    }
}

pub fn parse_config(cfg: &str) -> Config {
    toml::from_str::<Config>(cfg).unwrap()
}

pub async fn load_config() -> Config {
    let cfg_str = tokio::fs::read_to_string("config.toml").await.unwrap();
    parse_config(&cfg_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOML: &str = r#"
    address = "localhost:7890"

    [[targets]]
    id = "app-dev"
    host = "user.localhost"
    title = "App"
    url = "http://localhost:8080/"

    [[targets]]
    id = "app-dash-qa"
    host = "admin"
    title = "Dashboard"
    url = "https://qa.environment/"
    "#;

    fn make_test_config() -> Config {
        parse_config(TOML)
    }

    #[test]
    fn address_default_not_empty() {
        let cfg = parse_config("");
        assert!(cfg.address.eq("localhost:8080"));
    }

    #[test]
    fn address_correct() {
        let cfg = make_test_config();
        assert!(cfg.address.eq("localhost:7890"));
    }

    #[test]
    fn targets_correct() {
        let cfg = make_test_config();
        assert!(cfg.targets.len().eq(&2));

        assert_target(
            &cfg.targets[0], "app-dev", "user.localhost", "App", "http://localhost:8080/"
        );
        assert_target(
            &cfg.targets[1], "app-dash-qa", "admin", "Dashboard", "https://qa.environment/"
        );
    }

    #[test]
    fn get_target_not_found_returns_none() {
        let cfg = make_test_config();
        let target = cfg.get_target("not-found");
        assert!(target.is_none());
    }

    #[test]
    fn get_target_valid_returns_some() {
        let cfg = make_test_config();
        let target = cfg.get_target("app-dash-qa");
        assert!(target.is_some());
        assert_target(
            target.unwrap(), "app-dash-qa", "admin", "Dashboard", "https://qa.environment/"
        );
    }

    #[test]
    fn to_javascript_correct() {
        let cfg = make_test_config();
        let expected = r#"
        [
            {"id":"app-dev","host":"user.localhost","title":"App","url":"http://localhost:8080/"},
            {"id":"app-dash-qa","host":"admin","title":"Dashboard","url":"https://qa.environment/"}
        ]
        "#.replace("\n", "").replace(" ", "");
        let actual = cfg.to_javascript();

        assert_eq!(expected, actual);
    }

    fn assert_target(target: &Target, id: &str, host: &str, title: &str, url: &str) {
        assert_eq!(target.id, id.to_string());
        assert_eq!(target.host, host.to_string());
        assert_eq!(target.title, title.to_string());
        assert_eq!(target.url, url.to_string());
    }
}