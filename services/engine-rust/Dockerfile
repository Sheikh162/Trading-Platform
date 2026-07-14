# =========================================================================
# 1. BUILD STAGE (Cache Optimization)
# =========================================================================
FROM rust:1.78-slim-bookworm AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration and sources
COPY Cargo.toml ./
COPY src ./src

# Compile final release binary
RUN cargo build --release

# =========================================================================
# 2. RUNTIME STAGE (Minimal Image Footprint)
# =========================================================================
FROM debian:bookworm-slim AS runner
WORKDIR /app

# Install native client libraries
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from build stage
COPY --from=builder /app/target/release/engine-rust /usr/local/bin/engine-rust

LABEL org.opencontainers.image.title="trading-platform-engine-rust"

# Execute application
CMD ["engine-rust"]
