use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use axum::{routing::get, Router, http::StatusCode, response::IntoResponse, Json};
use redis::AsyncCommands;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use engine_rust::engine::Engine;
use engine_rust::redis_manager::RedisManager;
use engine_rust::types::RedisMessageEnvelope;

// =========================================================================
// 1. HEALTH AND STATUS STATE
// =========================================================================

/// Shared atomic values indicating service status
#[derive(Clone)]
struct AppState {
    ready: Arc<AtomicBool>,
    shutting_down: Arc<AtomicBool>,
}

// =========================================================================
// 2. ROOT DRIVER ENTRYPOINT (Top-Down Layout)
// =========================================================================

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A. Bootstrap live logging adapters
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting Rust Matching Engine...");

    // B. Configuration reading
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        let user = std::env::var("POSTGRES_USER").unwrap_or_else(|_| "postgres".to_string());
        let password = std::env::var("POSTGRES_PASSWORD").unwrap_or_else(|_| "postgres".to_string());
        let host = std::env::var("POSTGRES_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = std::env::var("POSTGRES_PORT").unwrap_or_else(|_| "5432".to_string());
        let db = std::env::var("POSTGRES_DB").unwrap_or_else(|_| "trading-platform".to_string());
        format!("postgres://{}:{}@{}:{}/{}", user, password, host, port, db)
    });
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| {
        let host = std::env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        format!("redis://{}:6379", host)
    });
    let health_port = std::env::var("HEALTH_PORT")
        .unwrap_or_else(|_| "8082".to_string())
        .parse::<u16>()
        .unwrap_or(8082);

    let state = AppState {
        ready: Arc::new(AtomicBool::new(false)),
        shutting_down: Arc::new(AtomicBool::new(false)),
    };

    // C. Setup Axum HTTP health server in background
    setup_health_check_server(health_port, state.clone()).await;

    // D. Database hydration and Engine orchestrator loading
    let db_pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres database");
    
    let mut engine = Engine::new();
    engine.hydrate_from_db(&db_pool).await?;

    // E. Redis integration layers
    let redis_manager = RedisManager::new(&redis_url).await?;
    let redis_client = redis::Client::open(redis_url)?;
    let mut pop_conn = redis_client.get_multiplexed_tokio_connection().await?;

    state.ready.store(true, Ordering::Relaxed);
    tracing::info!("Matching Engine fully hydrated, connected to Redis, and marked READY.");

    // F. Setup shutdown signal adapters
    setup_shutdown_signal_adapters(state.clone());

    // G. Live Queue processing Loop (FIFO)
    while !state.shutting_down.load(Ordering::Relaxed) {
        let raw_payload: Option<String> = match pop_conn.rpop("messages", None).await {
            Ok(val) => val,
            Err(err) => {
                tracing::error!("Redis RPOP pop execution encountered error: {:?}", err);
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                continue;
            }
        };

        if let Some(payload) = raw_payload {
            match serde_json::from_str::<RedisMessageEnvelope>(&payload) {
                Ok(envelope) => {
                    engine.process(envelope.message, &envelope.client_id, &redis_manager);
                }
                Err(err) => {
                    tracing::error!("JSON parsing failed for pop payload wrapper: {:?}", err);
                }
            }
        } else {
            // Keep poll checks light on CPU when queue is empty
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
    }

    // H. Application gracefully terminating
    tracing::info!("Received exit directive. Serialization and persistence sequence activated...");
    engine.close();
    tracing::info!("State snapshot saved safely. Terminating process successfully.");
    Ok(())
}

// =========================================================================
// 3. SERVICE HELPERS AND ROUTERS (Top-Down Ordering)
// =========================================================================

/// Starts the Axum web server to respond to Kubernetes/load-balancer requests
async fn setup_health_check_server(port: u16, state: AppState) {
    let app = Router::new()
        .route("/healthz", get(health_router))
        .route("/readyz", get(health_router))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tokio::spawn(async move {
        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => {
                tracing::info!("Health check server online at http://0.0.0.0:{}", port);
                if let Err(err) = axum::serve(listener, app).await {
                    tracing::error!("Axum HTTP server process crash: {:?}", err);
                }
            }
            Err(err) => {
                tracing::error!("Failed bind binding health API port: {:?}", err);
            }
        }
    });
}

/// Dynamic responder query mapping state checks to status responses
async fn health_router(axum::extract::State(state): axum::extract::State<AppState>) -> impl IntoResponse {
    let is_ready = state.ready.load(Ordering::Relaxed);
    let is_shutting = state.shutting_down.load(Ordering::Relaxed);

    if is_ready && !is_shutting {
        (StatusCode::OK, Json(serde_json::json!({
            "status": "ok",
            "service": "engine"
        })))
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({
            "status": "error",
            "service": "engine"
        })))
    }
}

/// Captures termination signals (Ctrl+C, kill) dynamically updating state values
fn setup_shutdown_signal_adapters(state: AppState) {
    tokio::spawn(async move {
        let mut term_sig = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
        let mut int_sig = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::interrupt()).unwrap();

        tokio::select! {
            _ = term_sig.recv() => {
                tracing::warn!("Termination request (SIGTERM) received!");
            }
            _ = int_sig.recv() => {
                tracing::warn!("Interrupt request (SIGINT) received!");
            }
        }

        tracing::info!("Switching service statuses to shutdown/unready...");
        state.shutting_down.store(true, Ordering::Relaxed);
        state.ready.store(false, Ordering::Relaxed);
    });
}
