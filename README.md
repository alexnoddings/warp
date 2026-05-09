# Warp

Warp is a locally-hosted quick launch dashboard for web links.

It was also an excuse for me to play around with a different design aesthetic.

## Demo

See a demo version of this site at https://warp-demo.alexnoddings.com/

## Config

Warp is configured via `config.toml` in the process's working directory.
See [`config.toml`](config.toml) for a sample configuration.

## Building

Warp is built with Cargo and NPM.

The Rust server embeds the app's bundle at compile time, so the client needs to be built first, then the server:
```bash
cd client
npm run build
cd ..
cargo build [--release]
```

Alternatively, the client can be run standalone. If done this way, you should fill in the `warpTargets = []`.
```bash
cd client
npm run dev
```

## Running with Docker

### Prerequisites

Requires [Docker](https://docs.docker.com/get-docker/) with the Compose plugin,
or [Podman](https://podman.io/docs/installation) with [podman-compose](https://github.com/containers/podman-compose)

### Quick start

1. Copy `config.toml` somewhere, eg `~/.warp/config.toml`
    - Configure `address = "0.0.0.0:{port}"`
2. Build the image
   ```bash
   docker build . -t warp
   ```
3. Copy `compose.yml` somewhere, eg `~/.warp/compose.yml`
    - Configure the config volume path for the host if it isn't stored in the same folder
4. Run compose to start the app
   ```bash
   docker compose up -d
   # or
   podman compose
   ```
