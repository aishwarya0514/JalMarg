# 🌊 JalMarg (जलमार्ग) — Hyperlocal Urban Flood & Waterlogging Hazard Router

**WeMakeDevs x AWS Bharat Builds Tour — Environmental Hacks**

> **Autonomous Monsoon Surveillance & Dynamic Flood Detour Engine**
> JalMarg empowers urban commuters and emergency services to report monsoon waterlogging hazards and dynamically recalculates travel routes to bypass flooded underpasses and impassable streets — visibly contrasting dangerous direct routes against safe, engine-protecting detours.

---

## 🌟 Key Features

1. **Interactive Leaflet Flood Hazard Map**
   - Centered on Bengaluru monsoon hotspots (Silk Board, Koramangala 80ft, Bellandur Ecospace, HSR Layout, Indiranagar).
   - Water-depth color-coded pins:
     - 🔴 **CRITICAL** (>3.5 ft / Impassable submerged underpass)
     - 🟠 **MEDIUM** (1.5 - 2.5 ft / Knee-deep, hydro-lock risk)
     - 🟡 **LOW** (<1 ft / Ankle-deep, slow traffic crawl)
   - Rich popup cards with depth in centimeters, timestamp, reporter info, and AWS Rekognition validation badges.

2. **Dual Routing & Hazard Avoidance View**
   - **Direct Route (Dashed Red Line)**: Default shortest path crossing impassable waterlogged nodes with hazard penalty delay.
   - **JalMarg Safe Detour (Solid Emerald Green Line)**: Dynamic bypass corridor routed safely around flooded bottlenecks.
   - **Route Comparison Metric Card**: Real-time comparison showing distance, estimated time saved, and warning tags (e.g., *"Saved engine damage: Bypassed Silk Board Central Underpass"*).

3. **Citizen Report Intake & Computer Vision Verification**
   - Click-to-pin on map or one-tap GPS coordinate capture.
   - Severity and water-depth classification (Ankle / Knee / Impassable).
   - Evidence photo upload with instant preview.
   - **Amazon Rekognition** `DetectLabels` integration verifying flood keywords (`Water`, `Flood`, `Rain`, `Puddle`, `Street`, `Submerged`).

4. **Automated 3-Hour TTL Lifecycle**
   - Stored in Amazon DynamoDB with `expiresAt = current_epoch + 10800` (3 hours).
   - DynamoDB Native TTL automatically purges receded flood reports, keeping routing decisions fresh.

5. **Zero-Cloud Resilient Demo Mode**
   - Automatically falls back to high-fidelity local state if AWS endpoints are offline, ensuring smooth hackathon demo recordings.

---

## 🏗️ Architecture & AWS Services

```
                       ┌───────────────────────────────┐
                       │     React + TypeScript        │
                       │     Leaflet Map Frontend      │
                       └──────────────┬────────────────┘
                                      │ REST / JSON
                                      ▼
                       ┌───────────────────────────────┐
                       │     Amazon API Gateway        │
                       └──────┬───────────────┬────────┘
                              │               │
                 POST /hazards│               │POST /route
                              ▼               ▼
           ┌─────────────────────┐   ┌─────────────────────────┐
           │ ingest_report Lambda│   │ calculate_route Lambda  │
           └────┬──────────┬─────┘   └────────────┬────────────┘
                │          │                      │
   DetectLabels │          │ PutItem              │ Scan / Query
                ▼          ▼                      ▼
  ┌─────────────────┐  ┌──────────────────────────────────────┐
  │ Amazon          │  │ Amazon DynamoDB: JalMarg_Hazards     │
  │ Rekognition     │  │ (PK: HAZARD, SK: id, TTL: expiresAt) │
  └─────────────────┘  └──────────────────────────────────────┘
        │
   Store evidence
        ▼
  ┌─────────────────┐
  │ Amazon S3       │
  │ Evidence Bucket │
  └─────────────────┘
```

---

## 🚀 Quickstart: Running Locally (Zero AWS Cloud Setup Required)

### 1. Start the Local Backend Server (Port 5000)
The local server bridges requests directly to the Python Lambda handlers without requiring Docker:

```powershell
python backend/lambdas/local_server.py
```
> Running on `http://127.0.0.1:5000`. Endpoints: `GET /hazards`, `POST /hazards`, `POST /route`, `GET /health`.

### 2. Start the React Frontend (Port 3000)
Open a second terminal window:

```powershell
cd frontend
npm install
npm run dev
```
> Open your browser at `http://localhost:3000`.

### 3. Run Automated Tests
Execute backend unit tests covering Geohash indexing, Rekognition verification, hazard retrieval, and dual routing calculations:

```powershell
python -m unittest backend/tests/test_jalmarg.py -v
```

---

## ☁️ Deploying to AWS (AWS SAM)

To deploy production serverless infrastructure to your AWS account:

```bash
# 1. Build serverless artifacts
sam build --template-file backend/template.yaml

# 2. Deploy guided CloudFormation stack
sam deploy --guided
```

This provisions:
- **DynamoDB Table**: `JalMarg_Hazards` with native TTL on `expiresAt`
- **S3 Bucket**: `jalmarg-evidence-*` for flood evidence images
- **IAM Roles**: Least-privilege permissions for DynamoDB, S3, and `rekognition:DetectLabels`
- **API Gateway**: CORS-enabled REST endpoints for `/hazards` and `/route`
- **Lambda Functions**: Python 3.11 runtimes for ingest, hazard retrieval, and route calculation

---

## 🧪 Seed Data Locations (Bengaluru Hotspots)

Pre-loaded in `backend/lambdas/seed_data.json`:
1. **Silk Board Central Underpass**: Critical (>4.5ft depth)
2. **Koramangala 80ft Road (Sony World)**: Medium (2ft depth)
3. **Bellandur Ecospace Service Road**: Critical (3.8ft depth)
4. **HSR Layout 5th Main**: Medium (1.8ft depth)
5. **Indiranagar 100ft Road**: Low (0.8ft depth)

---

## ⚠️ Safety Disclaimer
*JalMarg is a decision-support and surveillance tool grounded in crowdsourced telemetry and vision verification. Road conditions during cloudbursts and flash floods can alter rapidly. Never attempt to drive through standing water of unverified depth.*
