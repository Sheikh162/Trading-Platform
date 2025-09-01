# Real-Time Trading Platform

A full-stack, microservices-based trading platform featuring real-time order matching, live market data via WebSockets, and a professional trading interface.

---

## ✨ Tech Stack & Features

| Category       | Technology / Feature                                                       |
| -------------- | -------------------------------------------------------------------------- |
| **Architecture** | Microservices (API, Engine, WebSocket, DB Worker, Frontend, Market Maker) |
| **Frontend**     | Next.js 14, React 19, TypeScript, Tailwind CSS, Lightweight Charts       |
| **Backend**      | Node.js, Express.js, TypeScript                                           |
| **Database**     | TimescaleDB (for time-series trade data)                                 |
| **Real-time**    | WebSocket, Redis Pub/Sub for live order book and trade notifications     |
| **Messaging**    | Redis-based message queue for high-performance order processing          |
| **Infrastructure** | Docker & Docker Compose for easy, consistent local deployment           |
| **Testing**      | Vitest for unit tests in the matching engine                             |

---

## 🚀 Local Development Setup with Docker

This project is fully containerized. Follow these steps to get all services up and running with a single command.

### Prerequisites
- Docker
- Docker Compose

### Steps

1. **Clone the Repository**
    ```bash
    git clone https://github.com/sheikh162/trading-platform.git
    cd trading-platform
    ```

2. **Create Your Environment Files**

    This project uses `.env` files to manage configuration. Templates are provided to get you started.

    - Create the root `.env` file for Docker Compose:
      ```bash
      cp .env.example .env
      ```
      *(This file controls the ports for the services.)*

    - Create `.env` files for each individual service:
      ```bash
      cp api/.env.example api/.env
      cp db/.env.example db/.env
      cp engine/.env.example engine/.env
      cp frontend/.env.example frontend/.env
      cp mm/.env.example mm/.env
      cp ws/.env.example ws/.env
      ```
      *(Default values should work for most local setups.)*

3. **Build and Run the Application**

    This command will build all service images and start the containers in the background.
    ```bash
    docker compose up -d --build
    ```

    - `--build`: Forces Docker to build the images on the first run.
    - `-d`: Runs the containers in detached mode (in the background).

4. **Seed the Database (First-Time Setup)**

    To initialize the database with the necessary tables and materialized views, run the seed service using its profile:
    ```bash
    docker compose --profile seed up
    ```
    You only need to run this once when you first set up the project or whenever you want to reset the database.

5. **Accessing the Services**

    - Frontend: [http://localhost:3002](http://localhost:3002) (or your `${FRONTEND_PORT}`)
    - API: [http://localhost:3000](http://localhost:3000) (or your `${API_PORT}`)
    - Database: Connect on `localhost:5432` (or your `${TIMESCALE_PORT}`)

6. **Stopping the Application**

    To stop and remove all running containers, use:
    ```bash
    docker compose down
    ```

---

## 📂 Project Structure

