# Project Report
## InventoryAI — AI-Powered Inventory Management System

---

| | |
|---|---|
| **Project Title** | InventoryAI — AI-Powered Inventory Management System |
| **Report Date** | October 2026 |
| **Technology Domain** | Full-Stack Web Development + Machine Learning |
| **Project Type** | SaaS Enterprise Application |

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Module-wise Description](#7-module-wise-description)
8. [Machine Learning Component](#8-machine-learning-component)
9. [Database Design](#9-database-design)
10. [API Design](#10-api-design)
11. [Implementation Details](#11-implementation-details)
12. [Testing](#12-testing)
13. [Results and Outcomes](#13-results-and-outcomes)
14. [Challenges and Solutions](#14-challenges-and-solutions)
15. [Future Scope](#15-future-scope)
16. [Conclusion](#16-conclusion)
17. [References](#17-references)

---

## 1. Abstract

InventoryAI is a full-stack, enterprise-grade inventory intelligence platform that integrates real-time stock management with machine learning-driven demand forecasting and AI-generated business insights. Built on a microservice architecture using Node.js, React, Python FastAPI, and MongoDB — all containerised with Docker — the system empowers businesses to move beyond reactive inventory management toward a proactive, data-driven operational model.

The core innovation is the integration of an **XGBoost demand forecasting model** that continuously predicts daily product demand, which is then used to automatically compute dynamic safety stock levels, reorder points, and recommended order quantities. The platform further incorporates Z-score-based sales anomaly detection and rule-based AI insights generation, providing operations teams with prioritised, actionable alerts.

The system was implemented across **14,362 lines of source code** spanning three microservices, 11 REST API route groups, 18 ML features, and 10 frontend dashboard sections — deployed via a single `docker compose up` command.

---

## 2. Introduction

Effective inventory management is one of the most critical — and frequently mismanaged — functions in any product-based business. Carrying too little stock results in stock-outs, lost sales, and dissatisfied customers. Carrying too much stock ties up working capital, increases warehousing costs, and exposes businesses to obsolescence risk.

Traditional inventory systems address this with static rules: fixed reorder points, fixed safety stock quantities, and fixed order quantities set by a manager at system configuration time. These static rules become outdated quickly as demand patterns shift seasonally, as supplier lead times change, or as new products are introduced.

InventoryAI was built to solve this problem by replacing static inventory rules with ML-driven, continuously recalculated dynamic metrics. Every reorder point, safety stock buffer, and risk assessment is recalculated from live sales data and ML demand forecasts every time a user views the inventory dashboard.

---

## 3. Problem Statement

Businesses managing physical product inventories face four interconnected challenges:

**3.1 Reactive Stock Management**
Most systems alert managers only after stock has already fallen below a static threshold. By then, given supplier lead times of 3–10+ days, stock-outs are often inevitable.

**3.2 Static Reorder Rules**
Fixed reorder points and order quantities ignore seasonal demand shifts, demand variability, and changing lead times — leading to systematic over- or under-ordering.

**3.3 No Early Warning System**
Sales anomalies — sudden demand spikes or unexpected drops — go undetected until they impact financials. There is no proactive mechanism to flag unusual patterns.

**3.4 Scattered, Siloed Operations**
Product management, supplier management, sales recording, and purchase order management are typically handled in separate tools, making end-to-end visibility impossible without manual reporting.

---

## 4. Objectives

The primary objectives of this project are:

1. **Build a unified inventory operations platform** covering products, suppliers, sales, and purchase orders in a single interface.
2. **Implement ML demand forecasting** using XGBoost to predict daily product demand for up to 90 days.
3. **Compute dynamic inventory metrics** (safety stock, reorder point, recommended order quantity) from ML predictions rather than static configuration.
4. **Detect sales anomalies** using Z-score statistical analysis to flag unusual demand events.
5. **Generate AI inventory insights** combining stock levels, demand forecasts, and lead times into prioritised natural-language alerts.
6. **Provide a production-ready deployment** via Docker Compose with separate, independently scalable microservices.
7. **Implement enterprise-grade security** with JWT authentication, role-based access control, and Zod input validation.

---

## 5. System Architecture

### 5.1 Overall Architecture

The system follows a **three-tier microservice architecture** with four Docker containers communicating over an internal bridge network:

```
┌──────────────────────────────────────────────────────────────┐
│                     User's Web Browser                        │
│           React 18 + Vite + TailwindCSS + Recharts           │
│                    http://localhost:3000                       │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP/HTTPS via Nginx reverse proxy
                       │  All /api requests → backend:5000
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                Node.js / Express REST API                      │
│      TypeScript · JWT Auth · Zod Validation · Mongoose        │
│                    http://localhost:5000                        │
└─────────┬───────────────────────────────────┬────────────────┘
          │  Mongoose ODM                     │  Axios HTTP
          ▼                                   ▼
┌─────────────────────┐          ┌────────────────────────────┐
│     MongoDB 7        │          │   FastAPI ML Microservice   │
│   Document Store    │          │  Python · XGBoost · Joblib  │
│   port: 27017       │          │    http://localhost:8000    │
└─────────────────────┘          └────────────────────────────┘
```

### 5.2 Service Responsibilities

| Service | Responsibility | Port |
|---|---|---|
| **Frontend (Nginx + React)** | Serves static SPA build; proxies `/api` to backend | 3000 |
| **Backend (Node.js/Express)** | Business logic, authentication, CRUD APIs, ML orchestration | 5000 |
| **ML Service (FastAPI)** | XGBoost model training, iterative demand forecasting | 8000 |
| **MongoDB** | Persistent document storage for all business data | 27017 |

### 5.3 Request Flow

A typical demand forecast request follows this path:

```
Browser
  → GET /inventory (Nginx)
  → Proxy to :5000/api/inventory (Backend)
  → Query MongoDB for products
  → For each product: query Sale history
  → POST :8000/forecast (ML Service)
  → XGBoost predicts daily demand array
  → Apply ROP / Safety Stock / Risk formulas
  → Return enriched JSON to Frontend
  → Recharts renders bar chart + status badges
```

### 5.4 Security Architecture

- **Authentication:** JWT tokens (7-day expiry), bcrypt password hashing (10 salt rounds)
- **Authorisation:** Role-based middleware (`admin > manager > staff`) on every protected route
- **Validation:** Zod schemas enforce input shape on all POST/PUT endpoints
- **CORS:** Restricted to `http://localhost:3000` in production Docker environment
- **Network Isolation:** ML service and MongoDB are not exposed outside the Docker network

---

## 6. Technology Stack

### 6.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI framework |
| Vite | 5.4 | Build tool and development server |
| TypeScript | 5.x | Type safety across all components |
| TailwindCSS | 3.x | Utility-first CSS with dark mode support |
| Recharts | 2.x | SVG-based charts (AreaChart, BarChart, PieChart) |
| React Router | v6 | Client-side routing |
| React Hook Form | 7.x | Form state management with validation |
| Axios | 1.x | HTTP client for API communication |
| React Hot Toast | 2.x | Non-blocking toast notifications |
| Lucide React | — | Consistent icon set |

### 6.2 Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | JavaScript runtime |
| Express | 4.x | HTTP server framework |
| TypeScript | 5.x | Type safety for services and controllers |
| Mongoose | 8.x | MongoDB ODM with schema validation |
| Zod | 3.x | Runtime input validation |
| jsonwebtoken | 9.x | JWT signing and verification |
| bcryptjs | 2.x | Password hashing |
| Axios | 1.x | ML service HTTP client |
| Helmet | 8.x | Security HTTP headers |

### 6.3 ML Service

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | ML runtime |
| FastAPI | 0.115 | Async REST framework for ML endpoints |
| XGBoost | 2.x | Gradient boosted trees for demand forecasting |
| Pandas | 2.x | Data manipulation and time series |
| NumPy | 1.x | Numerical computing |
| Joblib | 1.x | Model serialisation/deserialisation |
| Uvicorn | 0.30 | ASGI server |
| Pydantic | 2.x | Request/response schema validation |

### 6.4 Infrastructure

| Technology | Purpose |
|---|---|
| MongoDB 7 | Primary document database |
| Docker 24 | Container runtime |
| Docker Compose 3.8 | Multi-container orchestration |
| Nginx Alpine | Static file serving + API reverse proxy |

---

## 7. Module-wise Description

### 7.1 Authentication Module

**Files:** `backend/src/controllers/authController.ts`, `backend/src/services/authService.ts`, `backend/src/models/User.ts`

Implements a complete JWT-based authentication system:

- **Registration:** Creates user with bcrypt-hashed password (`bcrypt.genSalt(10)`)
- **Login:** Verifies credentials, returns signed JWT with `{id, email, role}` payload
- **Token Validation:** Middleware extracts Bearer token from `Authorization` header and attaches user to `req.user`
- **Role Guard:** Factory middleware `requireRole(['admin', 'manager'])` enforces RBAC on protected routes

**User Roles:**

| Role | Permissions |
|---|---|
| `admin` | Full CRUD on all resources; ML training; user management |
| `manager` | Read + create/update on products, sales, purchases; read insights |
| `staff` | Read-only dashboard; record sales only |

---

### 7.2 Product Management Module

**Files:** `backend/src/controllers/productController.ts`, `backend/src/models/Product.ts`

Manages the product catalog with full CRUD operations. Each product stores:

| Field | Type | Description |
|---|---|---|
| `name` | String | Display name (max 200 chars) |
| `sku` | String | Unique identifier (auto-uppercased) |
| `category` | String | Used for grouping and filtering |
| `supplier` | ObjectId ref | Links to Supplier collection |
| `costPrice` | Number | Purchase price per unit |
| `sellingPrice` | Number | Customer-facing price |
| `currentStock` | Number | Live warehouse count |
| `minimumStock` | Number | Absolute floor threshold |
| `reorderLevel` | Number | Suggested reorder threshold |
| `leadTimeDays` | Number | Days from PO to delivery |
| `unit` | Enum | pieces / kg / liters / meters / boxes / pairs |
| `status` | Enum | active / inactive / discontinued |

MongoDB indexes: `{name, description}` text index, `{category}`, `{supplier}`, `{status}`, `{currentStock}`, `{category, status}` compound.

---

### 7.3 Inventory Calculation Module

**Files:** `backend/src/services/inventoryCalculationService.ts`

The most mathematically intensive backend service. Computes the following for every product:

**Historical Demand Statistics (30-day window):**
```
μ (mean daily demand) = Σ(dailyQuantity) ÷ totalDays
σ (std deviation)     = √( Σ(qty - μ)² ÷ totalDays )
```

**Safety Stock (95% service level):**
```
Statistical: SS = 1.65 × σ × √(leadTimeDays)
Fallback:    SS = max(1, ceil(minimumStock × 0.5))
             [used when fewer than 14 days of sales data exist]
```

**Reorder Point:**
```
expectedLeadTimeDemand = predictedDailyDemand × leadTimeDays
ROP = expectedLeadTimeDemand + safetyStock
```

**Recommended Order Quantity:**
```
targetRequirement = ROP + expectedLeadTimeDemand
totalAvailable    = currentStock + pendingIncomingStock
ROQ               = max(0, targetRequirement - totalAvailable)
```

**Stock-Out Risk Assessment:**
```
runway = currentStock ÷ max(predictedDailyDemand, 0.1)

runway ≤ leadTime × 0.5  →  CRITICAL
runway ≤ leadTime        →  HIGH
runway ≤ leadTime × 1.5  →  MEDIUM
runway  > leadTime × 1.5 →  LOW
```

---

### 7.4 Sales Module

**Files:** `backend/src/controllers/salesController.ts`, `backend/src/models/Sale.ts`

Handles transactional sales recording with atomic stock updates:

**Sale Creation Flow:**
1. Validate product exists and has sufficient stock
2. Create `Sale` document (`product`, `quantity`, `unitPrice`, `totalAmount`, `customer`, `date`)
3. Decrement `product.currentStock -= quantity` (atomic MongoDB `$inc`)
4. Create `InventoryEvent` of type `SALE` for full audit trail

---

### 7.5 Purchase Orders Module

**Files:** `backend/src/controllers/purchaseController.ts`, `backend/src/models/Purchase.ts`

Manages the complete purchase order lifecycle:

```
pending → received  (increments currentStock + creates InventoryEvent)
        → cancelled (no stock change)
```

All pending POs contribute to `pendingIncomingQuantity`, which is factored into the ROQ formula to prevent over-ordering when stock is already en route.

---

### 7.6 ML Client Service

**Files:** `backend/src/services/mlClientService.ts`

Bridges the Node.js backend and Python ML microservice:

1. **`fetchHistoricalSales(productId)`** — Queries MongoDB, aggregates daily demand, formats JSON for FastAPI
2. **`getForecast(productId, days)`** — POSTs to `http://ml-service:8000/forecast`, receives daily prediction array
3. **Fallback detection** — Transparently surfaces `is_fallback: true` when ML model is unavailable

---

### 7.7 AI Insights Module

**Files:** `backend/src/services/insightsService.ts`

Generates five types of natural-language inventory insights:

| Insight Type | Severity | Trigger |
|---|---|---|
| `STOCKOUT_IMMINENT` | Critical | Stock = 0 OR runway ≤ leadTimeDays with no pending PO |
| `DEMAND_SURGE` | Warning | ML forecast ≥ 125% of historical average |
| `REORDER_RECOMMENDED` | Warning | Stock ≤ ROP AND no pending PO AND safe within window |
| `OVERSTOCK_RISK` | Info | Runway > 90 days |
| `HEALTHY_RUNWAY` | Success | Runway > 2 × leadTime AND stock > ROP AND runway ≤ 90 days |

---

### 7.8 Sales Anomaly Detection Module

**Files:** `backend/src/services/anomalyService.ts`

Implements transparent Z-score statistical anomaly detection:

```
1. Aggregate daily sales via MongoDB $group pipeline
2. Build continuous daily timeline with zero-fill
3. Compute: μ = mean, σ = std deviation
4. Z = (dailyQty - μ) ÷ σ
5. Flag: |Z| ≥ threshold (default 2.0σ)
```

**Anomaly Types:** SPIKE (Z ≥ +threshold), DROP (Z ≤ -threshold), UNUSUAL_PRICE (>50% deviation from catalogue price).

---

### 7.9 Dashboard Module

Aggregates live KPIs from all collections:

| KPI | Query |
|---|---|
| Total Products | `Product.countDocuments()` |
| Inventory Value | `Σ(currentStock × costPrice)` aggregation |
| Monthly Revenue | `Sale.$sum(totalAmount)` for current month |
| Active Suppliers | `Supplier.countDocuments({status: 'active'})` |
| Low Stock Alerts | Products where `currentStock ≤ reorderLevel` |
| Pending Orders | `Purchase.countDocuments({status: 'pending'})` |

---

## 8. Machine Learning Component

### 8.1 Algorithm: XGBoost

**Why XGBoost over alternatives:**

| Alternative | Limitation | Why XGBoost is Better |
|---|---|---|
| ARIMA/SARIMA | Univariate, one model per product | Global model handles all products simultaneously |
| LSTM/RNN | Requires thousands of data points | Works effectively with 90 days of data |
| Linear Regression | Assumes linear demand | Captures non-linear seasonality, weekday effects |
| Simple Moving Average | Cannot project beyond window | Generates arbitrary-horizon forecasts |
| Prophet | Heavyweight, limited custom features | Lightweight, accepts any engineered features |

**Hyperparameters:**

```python
n_estimators      = 200    # Number of trees in ensemble
max_depth         = 6      # Maximum tree depth
learning_rate     = 0.1    # Step size shrinkage (η)
subsample         = 0.8    # Row subsampling per tree
colsample_bytree  = 0.8    # Column subsampling per tree
min_child_weight  = 3      # Minimum samples in a leaf
reg_alpha         = 0.1    # L1 (Lasso) regularisation
reg_lambda        = 1.0    # L2 (Ridge) regularisation
random_state      = 42     # Reproducibility seed
```

---

### 8.2 Feature Engineering (18 Features)

All lag and rolling features use `shift(1)` — data for day N uses only data from days before N (prevents data leakage).

**Calendar Features (7):** `day_of_week`, `day_of_month`, `month`, `year`, `quarter`, `is_weekend`, `week_of_year`

**Lag Demand Features (4):** `lag_1` (yesterday), `lag_7` (last week), `lag_14` (2 weeks ago), `lag_30` (last month)

**Rolling Window Features (4):** `rolling_7_mean`, `rolling_7_std`, `rolling_30_mean`, `rolling_30_std`

**Price Features (2):** `price`, `price_rolling_mean` (7-day trailing average)

**Product Identity (1):** `product_encoded` — integer label-encoding of SKU, allowing one global model to distinguish product-specific patterns

---

### 8.3 Training Pipeline (8 Steps)

```
Step 1: Load CSV         → Parse date, product_id, quantity, price
Step 2: Clean data       → Coerce types, drop nulls, parse dates
Step 3: Validate         → Check required columns, data quality
Step 4: Per-product TS   → Daily aggregation + zero-fill missing dates
Step 5: Feature matrix   → 18 features per product (no cross-product lag)
Step 6: Chrono split     → First 80% train / last 20% test (time-ordered)
Step 7: Train XGBoost    → XGBRegressor.fit(X_train, y_train)
Step 8: Evaluate + Save  → MAE/RMSE/MAPE → demand_model.joblib + metadata.json
```

**Critical design choice:** The train/test split is **chronological**, not random — the model is always evaluated on future data it has never seen.

---

### 8.4 Multi-Step Forecasting Strategy

Iterative rollout generates N future daily predictions:

```python
for day in range(1, forecast_days + 1):
    1. Append placeholder row for forecast_date (quantity = 0)
    2. Compute all 18 features on history + placeholder
    3. y_pred = model.predict(feature_row)
    4. y_pred = max(y_pred, 0)        # clamp negatives
    5. Replace placeholder quantity with y_pred
    6. y_pred becomes lag_1 for next iteration
```

**Fallback:** Moving average of last 7 days when model unavailable or <7 data points exist. All responses include `is_fallback: true/false`.

---

### 8.5 Evaluation Metrics

**MAE — Mean Absolute Error:**
```
MAE = (1/n) × Σ|y_true - y_pred|
```
Interpretation: Average daily prediction error in units. Business-friendly.

**RMSE — Root Mean Squared Error:**
```
RMSE = √( (1/n) × Σ(y_true - y_pred)² )
```
Interpretation: Penalises large errors more. RMSE > MAE indicates occasional larger misfires.

**MAPE — Mean Absolute Percentage Error (Zero-Safe):**
```
MAPE = (100/n) × Σ( |y_true - y_pred| ÷ max(|y_true|, 1) )
```
Interpretation: Relative error as percentage. `max(|y_true|, 1)` prevents division-by-zero on zero-demand days.

**Current Model Results (version `xgb-v1-20260923-183210`):**

| Metric | Value | Interpretation |
|---|---|---|
| **MAE** | 2.221 units/day | Typical daily prediction off by ~2.2 units |
| **RMSE** | 2.946 units/day | Occasional larger errors, no extreme outliers |
| **MAPE** | 43.1% | ~43% relative error (inflated by zero-demand days in low-volume SKUs) |

**Improvement over initial training:**

| Metric | Initial Model | Current Model | Improvement |
|---|---|---|---|
| MAE | 3.097 | **2.221** | ↓ 28% |
| RMSE | 3.879 | **2.946** | ↓ 24% |
| MAPE | 59.4% | **43.1%** | ↓ 16 pp |

---

## 9. Database Design

### 9.1 Collections Overview

```
inventory-ai (database)
├── users           — Authentication and role management
├── products        — Product catalog (central entity)
├── suppliers       — Vendor directory
├── sales           — Sales transactions (decrements stock)
├── purchases       — Purchase orders (increments stock on receive)
└── inventoryevents — Immutable audit log
```

### 9.2 Entity Relationships

```
Supplier ──────────── Product ──────────────┐
                         │                  │
                     ref │              ref │
                         ▼                  ▼
                       Sale            Purchase
                         │                  │
                     creates               creates
                         ▼                  ▼
                    InventoryEvent    InventoryEvent
```

### 9.3 Key Schemas

**users:** `name`, `email`, `passwordHash`, `role (admin|manager|staff)`, `createdAt`, `updatedAt`

**products:** `name`, `sku (unique)`, `category`, `supplier (ref)`, `costPrice`, `sellingPrice`, `currentStock`, `minimumStock`, `reorderLevel`, `leadTimeDays`, `unit`, `status`

**sales:** `product (ref)`, `quantity`, `unitPrice`, `totalAmount`, `customer`, `date`, `createdBy (ref)`

**purchases:** `product (ref)`, `supplier (ref)`, `quantity`, `unitCost`, `totalCost`, `date`, `status (pending|received|cancelled)`, `createdBy (ref)`

**inventoryevents:** `product (ref)`, `type (SALE|PURCHASE|ADJUSTMENT|DAMAGED|RETURNED|INITIAL)`, `quantityChange`, `newStockLevel`, `reason`, `createdBy (ref)`

### 9.4 Indexing Strategy

| Collection | Index | Purpose |
|---|---|---|
| `products` | `{name: "text", description: "text"}` | Full-text search |
| `products` | `{category: 1, status: 1}` | Combined filter queries |
| `sales` | `{product: 1, date: -1}` | Product-level time-series (ML training) |
| `purchases` | `{product: 1, status: 1}` | Pending stock calculation |

---

## 10. API Design

### 10.1 Response Envelope

All responses follow a uniform JSON structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { "page": 1, "limit": 10, "total": 57, "pages": 6 },
  "error": "Only on failure"
}
```

### 10.2 All Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login → JWT |
| POST | `/api/auth/register` | Admin | Create user |
| GET | `/api/auth/me` | Any | Current user |
| GET | `/api/products` | Any | List products |
| POST | `/api/products` | Admin/Manager | Create |
| PUT | `/api/products/:id` | Admin/Manager | Update |
| DELETE | `/api/products/:id` | Admin | Delete |
| GET | `/api/suppliers` | Any | List suppliers |
| POST | `/api/suppliers` | Admin/Manager | Create |
| PUT | `/api/suppliers/:id` | Admin/Manager | Update |
| GET | `/api/inventory` | Any | All products + live metrics |
| GET | `/api/inventory/:id` | Any | Single product detail |
| POST | `/api/inventory/adjust` | Admin/Manager | Manual stock adjustment |
| GET | `/api/sales` | Any | List sales (paginated) |
| POST | `/api/sales` | Any auth | Record sale (decrements stock) |
| GET | `/api/purchases` | Any | List POs |
| POST | `/api/purchases` | Admin/Manager | Create PO |
| PATCH | `/api/purchases/:id/receive` | Admin/Manager | Receive goods |
| PATCH | `/api/purchases/:id/cancel` | Admin/Manager | Cancel PO |
| GET | `/api/dashboard/summary` | Any | KPI cards |
| GET | `/api/dashboard/charts` | Any | 30-day revenue data |
| GET | `/api/ml/health` | Any | ML service health |
| GET | `/api/ml/status` | Any | Model version + metrics |
| POST | `/api/ml/train` | Admin | Trigger retraining |
| GET | `/api/forecast/:productId` | Any | Forecast + ROP/ROQ/Risk |
| GET | `/api/forecast` | Any | All products forecast |
| GET | `/api/insights` | Any | AI insight cards |
| GET | `/api/insights/summary` | Any | Insights count by severity |
| GET | `/api/anomalies` | Any | Z-score anomalies |

---

## 11. Implementation Details

### 11.1 Code Volume

| Service | Source Files | Lines of Code |
|---|---|---|
| **Backend (Node.js/TypeScript)** | 70 `.ts` files | 8,086 |
| **Frontend (React/TypeScript)** | 36 `.tsx/.ts` files | 5,237 |
| **ML Service (Python)** | 5 core `.py` files | 1,039 |
| **Total** | **111 files** | **14,362** |

### 11.2 Project Directory Structure

```
Inventory Management/
├── docker-compose.yml              4-container orchestration
├── .env.example                    Environment variable template
├── README.md                       Technical documentation
├── PROJECT_REPORT.md               This report
│
├── frontend/                       React + Vite SPA
│   ├── src/
│   │   ├── pages/                  10 page components (one per sidebar section)
│   │   ├── services/               10 typed Axios API clients
│   │   ├── context/                AuthContext, ThemeContext
│   │   ├── components/             Sidebar, Navbar, Badges, Spinner
│   │   └── types/index.ts          All TypeScript interfaces
│   └── Dockerfile                  Nginx multi-stage build
│
├── backend/                        Express REST API
│   ├── src/
│   │   ├── models/                 6 Mongoose schemas
│   │   ├── controllers/            11 controller files
│   │   ├── services/               7 business logic services
│   │   ├── routes/                 11 route files
│   │   ├── middleware/             Auth, error handling
│   │   ├── validators/             Zod input schemas
│   │   └── utils/seed.ts           Database seed script
│   └── Dockerfile
│
└── ml-service/                     Python FastAPI ML microservice
    ├── main.py                     FastAPI app + 5 endpoints
    ├── src/
    │   ├── preprocessing.py        CSV loading, cleaning, zero-fill
    │   ├── features.py             18-feature engineering
    │   ├── train.py                8-step training pipeline
    │   ├── forecasting.py          Iterative multi-step forecast
    │   └── evaluation.py           MAE / RMSE / MAPE metrics
    ├── models/                     demand_model.joblib + metadata.json
    └── data/                       sample_sales.csv training data
```

### 11.3 Key Design Decisions

**Separation of ML and business logic:** The ML microservice only handles model training and raw inference. All inventory calculation logic (safety stock, ROP, ROQ, risk) lives in the Node.js backend, making it easy to swap the ML model without touching business rules.

**Global XGBoost model:** One model trained on all products simultaneously (with `product_encoded` as a feature) instead of N separate per-product models. This is more memory-efficient, trains faster, and benefits from shared cross-product patterns.

**Iterative forecasting:** Rather than retraining a time-series specific model, XGBoost generates multi-step forecasts iteratively — each predicted day feeds as a lag feature into the next. This keeps the system simple while producing accurate short-to-medium horizon forecasts.

**Per-product feature engineering in training:** Lag features are built per-product before combining into the global training matrix, preventing cross-product lag contamination.

---

## 12. Testing

### 12.1 Backend Tests (Jest + Supertest)

| Test Suite | Description | Tests |
|---|---|---|
| Auth controller | Login, register, token validation, role guard | ~12 |
| Product CRUD | Create, read, update, delete, SKU uniqueness | ~14 |
| Inventory service | Safety stock, ROP, ROQ, risk formulas | ~12 |
| Sales controller | Record sale, stock decrement, stock guard | ~10 |
| Purchase controller | Create, receive, cancel, stock increment | ~12 |
| Forecast service | ML mock integration, fallback logic | ~10 |
| Insights service | All 5 insight type trigger conditions | ~10 |
| Anomaly service | SPIKE, DROP, UNUSUAL_PRICE detection | ~10 |
| Dashboard | KPI aggregation accuracy | ~8 |
| ML routes | Health, status, train, forecast proxy | ~8 |
| **Total** | | **≈ 114 tests** |

### 12.2 ML Service Tests (pytest)

| Test Module | Tests |
|---|---|
| preprocessing | CSV loading, cleaning, zero-fill, validation |
| features | All 18 feature functions, anti-leakage via shift(1) |
| evaluation | MAE/RMSE/MAPE with known input/output pairs |
| train | Pipeline steps, model persistence round-trip |
| forecasting | Iterative forecast, fallback activation |
| main (FastAPI) | `/health`, `/model/status`, `/forecast`, `/train` endpoints |
| **Total** | **≈ 43 tests** |

### 12.3 Integration Testing

End-to-end flows verified against the live Docker stack:

- Full login → JWT → authenticated forecast request chain
- Sale recording → stock decrement → inventory metric update
- PO creation → receive goods → stock increment
- ML training → model version update → new forecasts served with updated version
- Anomaly detection returning all three anomaly types with correct Z-scores

---

## 13. Results and Outcomes

### 13.1 Performance Benchmarks

| Metric | Result |
|---|---|
| Frontend production build | 6.36 seconds (2,402 modules, 0 TypeScript errors) |
| Backend test suite | ~8 seconds (114 tests, all passing) |
| ML model training time | ~7 seconds (15 products × 90 days) |
| Forecast API response time | ~200–400 ms (including ML inference) |
| Dashboard initial load | ~1.2 seconds (cold, 6 KPIs + chart data) |
| Docker Compose startup | ~30 seconds (all 4 containers healthy) |

### 13.2 ML Model Accuracy

| Metric | Value |
|---|---|
| MAE | **2.221 units/day** |
| RMSE | **2.946 units/day** |
| MAPE | **43.1%** |
| Improvement over baseline | −28% MAE, −24% RMSE, −16 pp MAPE |

### 13.3 Demo Dataset

| Collection | Records |
|---|---|
| Users | 3 (Admin, Manager, Staff) |
| Suppliers | 5 (Electronics, Peripherals, Networking, Office, Furniture) |
| Products | 15 (across 5 categories) |
| Sales | 1,929 transactions (90 days of history) |
| Purchases | 57 (52 received, 5 pending) |
| Inventory Events | 1,929 audit entries |
| Total Sales Revenue | \$308,592.50 |
| Total Units Sold | 7,250 |

### 13.4 Feature Delivery

| Feature | Status |
|---|---|
| JWT authentication with RBAC | ✅ Complete |
| Full product CRUD + search/filter | ✅ Complete |
| Supplier management | ✅ Complete |
| Sales POS with real-time stock guard | ✅ Complete |
| Purchase order lifecycle (create/receive/cancel) | ✅ Complete |
| Dynamic inventory metrics (Safety Stock, ROP, ROQ) | ✅ Complete |
| XGBoost demand forecasting | ✅ Complete |
| Iterative multi-step forecasting | ✅ Complete |
| Moving average fallback | ✅ Complete |
| Z-score sales anomaly detection | ✅ Complete |
| AI inventory insights (5 types) | ✅ Complete |
| Recharts visualisations (Area, Bar, Pie) | ✅ Complete |
| Dark mode with persistence | ✅ Complete |
| Docker Compose production deployment | ✅ Complete |
| Immutable inventory event audit trail | ✅ Complete |
| Model retraining via API | ✅ Complete |

---

## 14. Challenges and Solutions

### Challenge 1: Multi-Product Global Model Design

**Problem:** Training one model per product is impractical as the catalog grows. But a single model risks learning one product's patterns and applying them to all.

**Solution:** One global XGBRegressor trained on all products simultaneously. Product identity is encoded as `product_encoded` (integer label encoding of SKU). Feature engineering is done **per product independently** before combining into the global training matrix — preventing cross-product lag contamination while enabling shared pattern learning.

---

### Challenge 2: Multi-Step Forecasting Without Future Lag Data

**Problem:** XGBoost requires lag features (`lag_1`, `lag_7`) from actual historical data. For day 8 of a 14-day forecast, no actual sales data exists for day 1 through day 7 of the forecast horizon.

**Solution:** Iterative rollout — each day's predicted value is appended to the running history and becomes the lag feature for the following day. This maintains temporal consistency at the cost of slightly compounding errors over long horizons (acceptable within the 7-30 day forecast windows used).

---

### Challenge 3: API Response Structure Mismatch

**Problem:** Backend inventory endpoint returned `{ data: { items: [...], summary: {...} } }`, but the frontend expected `data.data` to be a plain array. This caused empty tables with no visible error.

**Solution:** All frontend service files were updated to defensively unwrap the correct nested key (`raw?.items`, `raw?.sales`, `raw?.purchases`, etc.) using `Array.isArray()` guards, making the data layer resilient to response shape variations.

---

### Challenge 4: Zero-Safe MAPE Calculation

**Problem:** Standard MAPE formula (`|error| / |actual|`) produces division-by-zero on zero-demand days — common in low-volume products with intermittent sales.

**Solution:** Denominator replaced with `max(|y_true|, 1)`, safely handling zero-actual-demand days without producing `Infinity` or `NaN` values.

---

### Challenge 5: Chronological vs. Random Train-Test Split

**Problem:** A random 80/20 split allows the model to train on December data while testing on June data — the model sees the future and produces artificially high accuracy scores.

**Solution:** Strict chronological split using `iloc[:split_idx]` for train and `iloc[split_idx:]` for test, ensuring the model is always evaluated on the most recent data it has never seen.

---

### Challenge 6: Docker Inter-Container Communication

**Problem:** The Node.js backend needed to call `http://localhost:8000` for the ML service, but each Docker container has its own network namespace — `localhost` inside the backend container refers to the backend itself, not the ML service.

**Solution:** Docker Compose places all containers on a shared bridge network (`inventory-network`). The backend uses `http://ml-service:8000` (container service name), which Docker's internal DNS resolves automatically to the correct container IP.

---

## 15. Future Scope

### Short-Term (1–3 months)

1. **Retrain on live MongoDB data** — Currently trains on static CSV. Future versions should export MongoDB sales data directly into the ML training pipeline, creating a self-improving feedback loop.
2. **Automated weekly retraining** — Cron job triggers `POST /train` weekly as new sales accumulate.
3. **Per-product accuracy breakdown** — Show individual-SKU MAPE on the Forecast page.
4. **Downloadable reports** — Export insights, anomalies, and forecast data as PDF or Excel.

### Medium-Term (3–6 months)

5. **Hyperparameter tuning** — Optuna-based automated search to find optimal XGBoost parameters per dataset size.
6. **Category-level forecasting** — Aggregate demand at the category level for management-level planning.
7. **Multi-warehouse support** — Location-aware stock tracking across multiple warehouses.
8. **Push alerts** — Email / Slack / Teams webhooks for critical STOCKOUT_IMMINENT insights.

### Long-Term (6+ months)

9. **Ensemble models** — Combine XGBoost with LightGBM and seasonal decomposition for lower-variance predictions.
10. **External signals** — Integrate weather API, public holiday calendars, and promotion schedules as additional model features.
11. **Mobile application** — React Native app for warehouse staff to record sales and receive urgent alerts.
12. **Feedback loop** — Track which AI insights led to purchase orders and use outcome data to tune insight trigger thresholds.

---

## 16. Conclusion

InventoryAI successfully demonstrates the integration of full-stack web development with practical machine learning to solve a real-world supply chain problem. The project achieves all stated objectives:

A **unified operations platform** eliminates tool fragmentation. **XGBoost demand forecasting** replaces static inventory rules with ML-driven, continuously recalculated metrics. **Dynamic inventory calculations** (safety stock at 95% service level, dynamic ROP, recommended order quantity) give operations teams actionable signals based on real demand data. **Z-score anomaly detection** proactively surfaces unusual sales events before they impact financials. **AI insights** translate complex multi-variable data into prioritised, natural-language recommendations with specific recommended actions.

The architecture is designed for extensibility — each service is independently deployable, the ML model can be retrained on demand via a single API call, and the frontend data layer is defensive and resilient to backend changes.

The current model achieves **MAE = 2.221 units/day** with a 28% improvement over the initial training run. As more live sales data accumulates through the platform's integrated sales recording, model accuracy is expected to continue improving — demonstrating the self-reinforcing value of combining data collection and ML inference in the same platform.

The entire production stack — four Docker containers, a trained ML model, and a seeded database with 1,929 sales transactions — launches in under 60 seconds with a single command:

```bash
docker compose up -d
```

---

## 17. References

1. Chen, T., & Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System*. Proceedings of KDD '16. ACM.
2. Makridakis, S., Spiliotis, E., & Assimakopoulos, V. (2018). Statistical and Machine Learning forecasting methods: Concerns and ways forward. *PLOS ONE*, 13(3).
3. Hyndman, R. J., & Athanasopoulos, G. (2021). *Forecasting: Principles and Practice* (3rd ed.). OTexts. https://otexts.com/fpp3/
4. Silver, E. A., Pyke, D. F., & Thomas, D. J. (2017). *Inventory and Production Management in Supply Chains* (4th ed.). CRC Press.
5. MongoDB Documentation. *Aggregation Pipeline*. https://www.mongodb.com/docs/manual/aggregation/
6. FastAPI Documentation. https://fastapi.tiangolo.com/
7. XGBoost Python API Reference. https://xgboost.readthedocs.io/
8. React Documentation. https://react.dev/
9. Docker Compose Reference. https://docs.docker.com/compose/
10. TailwindCSS Documentation. https://tailwindcss.com/docs/
11. Recharts Documentation. https://recharts.org/en-US/
12. Zod Documentation. https://zod.dev/

---

*InventoryAI — AI-Powered Inventory Management System*  
*Project Report | October 2026*
