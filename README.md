# StackPilot: Architectural Dependency Recommender System

StackPilot is an intelligent **Architectural Copilot** that suggests complementary infrastructure technologies (caching layers, message queues, database migration tools, observability agents) as developers compose their software stack on an interactive visual canvas.

---

## Current Service URLs

All services are running locally:

| Service | Technology | Port / URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + React Flow + Tailwind CSS | [http://localhost:5173](http://localhost:5173) | **Active** |
| **Core Backend** | Spring Boot + Spring Data JPA + PostgreSQL | [http://localhost:8080](http://localhost:8080) | **Active** |
| **ML Inference Engine** | Python + FastAPI + Scikit-Learn + FP-Growth | [http://localhost:8000/docs](http://localhost:8000/docs) | **Active** |
| **Database** | PostgreSQL | `localhost:5432/stackpilot_db` | **Active** |

---

## 1-Click Launch Scripts

From the repository root directory:

### Start All Services:
```bash
./start_all.sh
```

### Stop All Services:
```bash
./stop_all.sh
```

---

## Running Services Manually (Separate Terminals)

If you prefer to run services in dedicated terminal windows for live logs:

### Terminal 1: Python ML Engine (:8000)
```bash
cd ml-engine
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*(To retrain models from scratch: `python pipeline/train.py`)*

### Terminal 2: Spring Boot Backend (:8080)
```bash
cd core-backend
./mvnw spring-boot:run
```

### Terminal 3: React Frontend Canvas (:5173)
```bash
cd core-frontend
npm run dev
```

---

## Key Features

1. **Interactive Architecture Canvas:**
   - Visual nodes categorized by framework, database, queue, ops, and tools.
   - Dynamic dependency graph synthesis with animated directional links.
2. **AI Copilot Recommendation Drawer:**
   - Real-time suggestions powered by **FP-Growth** (multi-item association rules) and **Truncated SVD** (latent factor collaborative filtering).
   - Match percentage, algorithmic rationales, and lift metrics.
3. **One-Click Manifest Scaffolding:**
   - Instant generation of production-ready `docker-compose.yml` and `.env.example` pre-configured with networks, volumes, and ports.
4. **Architecture Persistence:**
   - Save and reload multi-component architectures directly to and from PostgreSQL.
