# First stage installs rust and dependencies
FROM rust:slim AS rust1

RUN rustup target add x86_64-unknown-linux-musl \
    && apt-get update -q \
    && apt-get install -y --no-install-recommends musl-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Build with a stub file to compile dependencies
# This caches the dependencies layer for faster rebuilds if Cargo.toml/lock isn't modified
COPY Cargo.toml Cargo.lock ./
RUN mkdir src \
    && echo 'fn main() {}' > src/main.rs \
    && cargo build --release --target x86_64-unknown-linux-musl \
    && rm -rf src

# Next stage restores JS dependencies and builds the app
FROM node:lts-slim AS js

WORKDIR /build/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client ./
RUN npm run build

FROM rust1 AS rust2

# server bundles some dist files at compile time
COPY --from=js /build/dist/index.html /build/dist/favicon.svg /build/dist/

# touch makes sure build properly builds rather than thinking main.rs is already compiled
COPY src ./src
RUN touch src/main.rs \
    && cargo build --release --target x86_64-unknown-linux-musl

FROM scratch

WORKDIR /app

COPY --from=rust2 /build/target/x86_64-unknown-linux-musl/release/warp /app/warp

ENTRYPOINT ["/app/warp"]
