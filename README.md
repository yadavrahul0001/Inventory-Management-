# InventoryAI — AI-Powered Inventory Management System

> A full-stack, enterprise-grade inventory intelligence platform combining **real-time stock management**, **ML demand forecasting**, **AI insights**, and **sales anomaly detection** in a unified SaaS dashboard.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Demo Credentials](#4-demo-credentials)
5. [Section-by-Section Walkthrough](#5-section-by-section-walkthrough)
   - [Dashboard](#51-dashboard)
   - [Real-Time Inventory](#52-real-time-inventory)
   - [Products](#53-products)
   - [Suppliers](#54-suppliers)
   - [Sales & POS](#55-sales--pos)
   - [Purchases](#56-purchases)
   - [Demand Forecast](#57-demand-forecast)
   - [Sales Anomalies](#58-sales-anomalies)
   - [AI Insights](#59-ai-insights)
   - [Settings](#510-settings)
6. [ML Model — XGBoost Demand Forecasting](#6-ml-model--xgboost-demand-forecasting)
   - [Why XGBoost?](#61-why-xgboost)
   - [Feature Engineering](#62-feature-engineering)
   - [Training Pipeline](#63-training-pipeline)
   - [Forecasting Strategy](#64-forecasting-strategy)
   - [Model Accuracy & Evaluation Metrics](#65-model-accuracy--evaluation-metrics)
   - [Inventory Calculations Using ML Output](#66-inventory-calculations-using-ml-output)
7. [API Reference](#7-api-reference)
8. [Project Structure](#8-project-structure)
9. [Database Seed Data](#9-database-seed-data)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│             React + Vite + TailwindCSS + Recharts               │
│                      http://localhost:3000                       │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP via Nginx reverse proxy
                         │  /api → backend:5000
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js / Express API                         │
│         TypeScript · Zod Validators · JWT Auth · Mongoose       │
│                      http://localhost:5000                       │
└──────┬─────────────────────────────────────────────┬────────────┘
       │  MongoDB Driver                             │  Axios HTTP
       ▼                                             ▼
┌─────────────────┐                    ┌───────────────────────────┐
│    MongoDB 7     │                    │   FastAPI ML Microservice  │
│  inventory-ai   │                    │   Python · XGBoost · Uvicorn│
│  port: 27017    │                    │   http://localhost:8000    │
└─────────────────┘                    └───────────────────────────┘
```

All four services run as Docker containers and communicate over an internal Docker bridge network (`inventory-network`). The frontend Nginx container proxies all `/api` requests to the backend, keeping the ML service and MongoDB hidden from the public internet.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, Recharts, React Router v6, React Hook Form, React Hot Toast |
| **Backend API** | Node.js 20, Express 4, TypeScript, Mongoose 8, Zod, bcryptjs, JWT, Axios |
| **ML Service** | Python 3.11, FastAPI, XGBoost, Pandas, NumPy, scikit-learn, Joblib, Uvicorn |
| **Database** | MongoDB 7 (NoSQL document store) |
| **Containerization** | Docker 24, Docker Compose 3.8 |
| **Reverse Proxy** | Nginx Alpine (serving static React build + API proxy) |

---

## 3. Getting Started

### Prerequisites
- Docker Desktop installed and running
- Ports `3000`, `5000`, `8000`, `27017` free

### Launch All Services

```bash
# Clone / open the project
cd "Inventory Management"

# Start all 4 containers (MongoDB, Backend, ML Service, Frontend)
docker compose up -d

# Seed the database with demo data (run once)
docker exec inventory-ai-backend node dist/utils/seed.js
```

Visit **http://localhost:3000** and log in with a demo account below.

### Train / Retrain the ML Model

```bash
# Via the FastAPI endpoint (recommended)
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"data_path": "data/sample_sales.csv", "sales_data": []}'
```

---

## 4. Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@inventory.ai` | `admin123` | Full access — all CRUD, ML training, user management |
| **Manager** | `manager@inventory.ai` | `manager123` | Read + create sales/purchases; no user management |
| **Staff** | `staff@inventory.ai` | `staff123` | Read-only dashboard + sales recording |

> **Tip:** The Login page includes one-click **Admin / Manager / Staff** autofill buttons so you never have to type credentials manually.

---

## 5. Section-by-Section Walkthrough

### 5.1 Dashboard

**Route:** `/` or `/dashboard`

The Dashboard is the first page after login. It aggregates live KPIs from all collections and presents a bird's-eye view of the business.

#### What It Shows

| Card | Source | Description |
|---|---|---|
| **Total Products** | `products` collection | Count of all active catalog items |
| **Total Inventory Value** | `products.currentStock × costPrice` | Total capital tied up in warehouse |
| **Monthly Revenue** | `sales` aggregation | Sum of `totalAmount` for the current calendar month |
| **Active Suppliers** | `suppliers` collection | Count of suppliers with `status: active` |
| **Low Stock Alerts** | Inventory calculation | Products whose `currentStock ≤ reorderLevel` |
| **Pending Orders** | `purchases` collection | Count of POs with `status: pending` |

#### Revenue Chart
A 30-day area chart (built with Recharts `AreaChart`) that aggregates daily sales revenue from the `sales` collection. Each data point is the sum of `totalAmount` for all sales on that date. The chart uses a smooth curve gradient fill to show revenue trends.

#### Inventory Health Pie
A `PieChart` showing the proportion of products in each status category:
- 🟢 Healthy
- 🟡 Reorder Recommended
- 🟠 Low Stock
- 🔴 Stock-out Risk / Critical

#### Top Products Table
The five products with the highest `currentStock × sellingPrice` value, showing revenue contribution ranking.

---

### 5.2 Real-Time Inventory

**Route:** `/inventory`

Displays live inventory intelligence for all 15+ products. Unlike a simple stock count, every metric here is dynamically calculated by combining historical sales data with ML demand forecasts.

#### Columns Explained

| Column | Formula / Source |
|---|---|
| **Product / SKU** | From `products` collection |
| **Current Stock** | `product.currentStock` (live, updated on each sale or purchase receive) |
| **Arriving** | Sum of `quantity` on all `purchases` with `status: pending` for this product |
| **Daily Demand** | Historical average: `total units sold in last 30 days ÷ 30` |
| **Safety Stock** | `Z × σ_demand × √(leadTime)` where Z = 1.65 (95% service level). Falls back to `50% of minimumStock` if fewer than 14 data points exist. |
| **Reorder Point (ROP)** | `expectedLeadTimeDemand + safetyStock` |
| **Runway (days)** | `currentStock ÷ predictedDailyDemand` |
| **Status Badge** | Categorical label: `Healthy / Reorder Recommended / Low Stock / Stock-out Risk / Critical` |
| **Risk Level** | `LOW / MEDIUM / HIGH / CRITICAL` based on runway vs. lead time ratio |

#### Risk Level Logic

```
runway ≤ leadTime × 0.5  →  CRITICAL (expedite order immediately)
runway ≤ leadTime        →  HIGH     (reorder now)
runway ≤ leadTime × 1.5  →  MEDIUM   (prepare next order)
runway  > leadTime × 1.5 →  LOW      (healthy)
```

#### Adjust Stock Modal

Clicking **Adjust Stock** opens a modal to record manual inventory events:
- **ADJUSTMENT** — manual correction (e.g., counted vs. recorded discrepancy)
- **DAMAGED** — write off damaged units
- **RETURNED** — customer returns re-entering stock
- **INITIAL** — first stock entry

Every adjustment creates an `InventoryEvent` record for full auditability.

---

### 5.3 Products

**Route:** `/products`

The product catalog with full CRUD capabilities. Each product is a central entity that links to suppliers, sales, purchases, and inventory events.

#### Product Fields

| Field | Description |
|---|---|
| `name` | Display name of the product |
| `sku` | Stock Keeping Unit — unique identifier (e.g., `MOUSE001`) |
| `category` | Product category used for grouping and filtering |
| `supplier` | Reference to a `Supplier` document |
| `costPrice` | Purchase price per unit (used in inventory valuation) |
| `sellingPrice` | Customer-facing price |
| `currentStock` | Live unit count in warehouse |
| `minimumStock` | Absolute floor — triggers "Low Stock" status |
| `reorderLevel` | Suggested reorder threshold (above minimumStock) |
| `leadTimeDays` | Days between placing an order and receiving goods |
| `unit` | Measurement unit (`pieces`, `boxes`, `kg`, etc.) |

#### Features
- **Search** by name or SKU (debounced)
- **Filter** by category and status
- **Add Product** modal with validation
- **Edit Product** — updates all fields inline
- **Delete** with confirmation guard
- Profit margin badge (`(sellingPrice - costPrice) / sellingPrice × 100`)

---

### 5.4 Suppliers

**Route:** `/suppliers`

Vendor directory for all purchase order counterparties. Supplier lead times directly feed into inventory ROP and safety stock calculations.

#### Supplier Fields

| Field | Description |
|---|---|
| `name` | Vendor company name |
| `email` | Order communication email |
| `phone` | Contact number |
| `address` | Warehouse / shipping address |
| `leadTimeDays` | Average days from PO placement to delivery — **critical for ROP** |
| `status` | `active` or `inactive` |

#### Impact on Calculations
The `leadTimeDays` value from a supplier propagates to every product linked to it:
- **Safety Stock**: `Z × σ × √(leadTimeDays)`
- **Reorder Point**: `predictedDailyDemand × leadTimeDays + safetyStock`
- **Risk Assessment**: runway compared against `leadTimeDays` thresholds

---

### 5.5 Sales & POS

**Route:** `/sales`

Point-of-sale and order log. Records customer sales transactions that deduct stock in real time and generate InventoryEvent audit entries.

#### KPI Cards (Page-Level)

| Card | Value |
|---|---|
| **Sales Transactions** | Total count from `pagination.total` |
| **Page Revenue** | Sum of `totalAmount` for the visible rows |
| **Units Sold** | Sum of `quantity` for the visible rows |

#### Record Sale Modal

When a staff member records a sale:
1. **Product selector** — auto-fills `unitPrice` from `product.sellingPrice`
2. **Quantity** — validated against `currentStock` with a live guard (cannot sell more than available)
3. **Customer name** — optional, used for anomaly detection correlation
4. **Backend processing** on submit:
   - Creates a `Sale` document
   - Decrements `product.currentStock` by `quantity`
   - Creates an `InventoryEvent` of type `SALE`
   - Returns error if stock is insufficient (race-condition safe)

#### Pagination
10 sales per page, sorted newest-first. Customer name search filters results server-side.

---

### 5.6 Purchases

**Route:** `/purchases`

Purchase Order (PO) management. Tracks replenishment orders from suppliers and receives goods into inventory.

#### PO Lifecycle

```
Created (pending) ──▶ Received (received) ──▶ Updates currentStock
                  └──▶ Cancelled (cancelled)
```

#### Pending Incoming Stock

All `purchases` with `status: pending` are summed per product to compute `pendingIncomingQuantity`. This value appears on the Inventory page as **"+X arriving"** and is factored into the Recommended Order Quantity formula to prevent over-ordering.

#### Create PO Modal

Fields: Product selector, Supplier selector, Quantity, Unit Cost (auto-filled from `product.costPrice`), PO Date.

#### Receive Goods

Clicking **Receive** on a pending PO:
1. Sets `purchase.status` to `received`
2. Increments `product.currentStock += purchase.quantity`
3. Creates an `InventoryEvent` of type `PURCHASE`

#### Status Filter Tabs

Switch between: `All Orders` | `Pending` | `Received` | `Cancelled`

---

### 5.7 Demand Forecast

**Route:** `/forecast`

The core ML page. Shows XGBoost demand predictions for individual products or all 15 products simultaneously.

#### Single Product Forecast

Select a product from the dropdown and choose forecast horizon (7, 14, 30, or 60 days). The page calls:

```
GET /api/forecast/:productId?days=7
```

Which:
1. Looks up the product in MongoDB
2. Queries historical sales from the `sales` collection
3. Calls `POST http://ml-service:8000/forecast` with the historical data
4. Receives daily predictions from XGBoost
5. Applies inventory formulas (ROP, ROQ, Safety Stock, Risk) to the predictions
6. Returns the complete forecast payload

#### What's Displayed

| Field | Value |
|---|---|
| **Daily Predictions** | Array of forecasted units per day (e.g., `[10.5, 11.7, 9.1, ...]`) |
| **Total Predicted Demand** | Sum of all daily predictions over the horizon |
| **Avg Daily Demand** | `totalDemand ÷ forecastDays` |
| **Safety Stock** | Calculated from ML demand + demand σ + lead time |
| **Reorder Point** | `expectedLeadTimeDemand + safetyStock` |
| **Recommended Order Qty** | How many units to order right now |
| **Days Until Stock-Out** | `currentStock ÷ predictedDailyDemand` |
| **Risk Level** | `LOW / MEDIUM / HIGH / CRITICAL` |
| **Model Version** | e.g., `xgb-v1-20260923-183210` |
| **Is Fallback** | `true` if the ML model was unavailable and a moving-average baseline was used |

#### All Products Forecast

The table at the bottom shows all 15 products simultaneously with their stock status, risk level, and recommended action.

#### Recharts Bar Chart

A `BarChart` renders the day-by-day prediction values with a `ReferenceLine` drawn at the average. Color encodes risk (green for low, amber for medium, red for high).

---

### 5.8 Sales Anomalies

**Route:** `/anomalies`

Statistically detects unusual sales events using Z-score analysis. Does not require ML — entirely transparent statistical math on MongoDB aggregations.

#### How It Works

For each product over a rolling `windowDays` (default: 60 days):

1. **Aggregate daily sales** using MongoDB `$group` to get `dailyQuantity` per calendar day
2. **Build complete timeline** — zero-fill missing days (no-sale days count as 0)
3. **Compute population statistics**:
   ```
   mean (μ)    = Σ(dailyQuantity) ÷ totalDays
   variance    = Σ(quantity - μ)² ÷ totalDays
   std dev (σ) = √variance
   ```
4. **Z-score for each day**:
   ```
   Z = (dailyQuantity - μ) ÷ σ
   ```
5. **Flag anomalies** when `|Z| ≥ threshold` (default: 2.0σ)

#### Anomaly Types

| Type | Trigger Condition | Severity |
|---|---|---|
| **SPIKE** | `Z ≥ +threshold` (unusually high sales) | Medium (Z≥2) / High (Z≥3) |
| **DROP** | `Z ≤ -threshold` AND `mean ≥ 5` (unusual low sales) | Medium (Z≤-2) / High (Z≤-3) |
| **UNUSUAL_PRICE** | `unitPrice / listPrice > 1.5 OR < 0.5` (50% deviation from catalog price) | Medium |

#### Configurable Threshold

A slider on the page lets you adjust the Z-score threshold from 1.0σ (very sensitive, more alerts) to 4.0σ (conservative, only extreme outliers). Changing the threshold immediately refetches results server-side.

#### Displayed Fields Per Anomaly

- Date, Product, SKU
- Actual quantity sold on that day
- Expected mean (μ) and standard deviation (σ)
- Z-score (how many standard deviations from the mean)
- Anomaly type badge
- Severity badge (medium / high)

---

### 5.9 AI Insights

**Route:** `/insights`

Generates actionable natural-language inventory intelligence by combining live stock data, ML demand forecasts, and supplier lead times. Insights are computed on every page load — no caching.

#### Insight Types

| Type | Severity | Trigger Condition |
|---|---|---|
| **STOCKOUT_IMMINENT** | 🔴 Critical | `currentStock === 0` OR `daysUntilStockOut ≤ leadTimeDays` with no pending PO |
| **DEMAND_SURGE** | 🟡 Warning | `predictedDailyDemand ≥ 1.25 × historicalAverage` (25%+ surge) |
| **REORDER_RECOMMENDED** | 🟡 Warning | `currentStock ≤ reorderPoint` AND no pending incoming stock AND still safe within lead time |
| **OVERSTOCK_RISK** | 🔵 Info | `daysUntilStockOut > 90 days` (capital tied up excessively) |
| **HEALTHY_RUNWAY** | 🟢 Success | `daysUntilStockOut > 2 × leadTimeDays` AND `currentStock > reorderPoint` AND `runway ≤ 90 days` |

#### Insight Card Contents

Each card includes:
- Product name and SKU
- Natural-language message explaining exactly what's happening and why
- **Recommended Action** — a specific, executable instruction (e.g., "Place an urgent purchase order for 45 units")
- Supporting metrics: current stock, daily demand, lead time, runway, reorder point, ROQ
- Severity-coded left border (red/amber/blue/green)

#### Severity Filter Tabs

Switch between viewing `All` | `Critical` | `Warning` | `Info` | `Success` insights.

#### Sort Order

Insights are always sorted `critical → warning → info → success` so the most urgent items appear first.

---

### 5.10 Settings

**Route:** `/settings`

User profile and application preferences. Currently includes:
- Display name, email, role information
- Dark/light theme toggle (persisted via localStorage)
- Password change (calls `PATCH /api/auth/change-password`)

---

## 6. ML Model — XGBoost Demand Forecasting

### 6.1 Why XGBoost?

We chose **XGBoost (eXtreme Gradient Boosting)** as the demand forecasting algorithm for the following reasons:

| Reason | Explanation |
|---|---|
| **Handles tabular time-series features natively** | Unlike LSTM/RNNs, XGBoost works directly on engineered lag and rolling features without needing sequential mini-batches or tensor reshaping |
| **Captures non-linear demand patterns** | Boosted decision trees automatically learn day-of-week effects, seasonality, and promotional spikes without explicit modeling |
| **Works well with limited data** | With 90 days of history per product, deep learning models overfit. XGBoost with regularisation (`reg_alpha`, `reg_lambda`) generalises effectively from small datasets |
| **Interpretable feature importances** | We can inspect which features (e.g., `lag_7`, `day_of_week`) drive predictions, making the model auditable for business stakeholders |
| **Fast training and inference** | Training on 15 products × 90 days takes under 10 seconds on CPU. Inference for a 7-day forecast completes in milliseconds |
| **Single global model across all products** | One model is trained on all products simultaneously. Product identity is encoded as a numerical feature (`product_encoded`), allowing the model to learn shared demand patterns (e.g., weekday peaks) while distinguishing product-specific behaviour |
| **Battle-tested in production forecasting** | XGBoost consistently wins demand forecasting benchmarks in retail, e-commerce, and supply chain competitions |

**Hyperparameters used:**

```python
n_estimators      = 200     # Number of boosting trees
max_depth         = 6       # Maximum tree depth
learning_rate     = 0.1     # Step size shrinkage
subsample         = 0.8     # Row subsampling (reduces overfitting)
colsample_bytree  = 0.8     # Column subsampling per tree
min_child_weight  = 3       # Minimum samples in a leaf
reg_alpha         = 0.1     # L1 regularisation
reg_lambda        = 1.0     # L2 regularisation
random_state      = 42      # Reproducible results
```

---

### 6.2 Feature Engineering

The model uses **18 features** engineered from raw date, quantity, and price data. All lag and rolling features use `shift(1)` — meaning the feature for day N uses only data from day N-1 and earlier. This strictly prevents **data leakage** (using future information during training).

#### Calendar / Time Features (7)

| Feature | Description |
|---|---|
| `day_of_week` | 0 = Monday … 6 = Sunday (captures weekly demand patterns) |
| `day_of_month` | 1–31 (captures monthly pay-cycle patterns) |
| `month` | 1–12 (captures seasonal trends) |
| `year` | Year integer (captures long-term trends) |
| `quarter` | 1–4 (captures quarterly business cycles) |
| `is_weekend` | 0 or 1 (binary flag for Sat/Sun) |
| `week_of_year` | 1–53 (ISO week number) |

#### Lag Demand Features (4)

These capture how much was sold N days ago:

| Feature | Description |
|---|---|
| `lag_1` | Units sold yesterday |
| `lag_7` | Units sold same day last week |
| `lag_14` | Units sold same day 2 weeks ago |
| `lag_30` | Units sold same day last month |

#### Rolling Window Features (4)

Smoothed statistics over trailing windows:

| Feature | Description |
|---|---|
| `rolling_7_mean` | Average daily demand over past 7 days |
| `rolling_7_std` | Demand variability over past 7 days |
| `rolling_30_mean` | Average daily demand over past 30 days |
| `rolling_30_std` | Demand variability over past 30 days |

#### Price Features (2)

| Feature | Description |
|---|---|
| `price` | Unit price on that day |
| `price_rolling_mean` | 7-day trailing average price |

#### Product Identity Feature (1)

| Feature | Description |
|---|---|
| `product_encoded` | Integer label-encoding of product SKU. Allows one model to serve all products while learning product-specific demand patterns |

---

### 6.3 Training Pipeline

The training pipeline runs in 8 steps:

```
Step 1: Load CSV → Validate schema (required: date, product_id, quantity, price)
Step 2: Clean data → parse dates, coerce types, drop invalid rows
Step 3: Per-product time series → daily aggregation, zero-fill missing dates
Step 4: Feature engineering → all 18 features built per product (no cross-product lag)
Step 5: Chronological train/test split → first 80% = train, last 20% = test
Step 6: Train XGBRegressor → fit on training set
Step 7: Evaluate → predict on test set, compute MAE / RMSE / MAPE
Step 8: Save → demand_model.joblib + model_metadata.json
```

**Important:** The split is **chronological**, not random. This ensures the evaluation mimics real-world use — the model is tested on future data it has never seen, not randomly sampled historical data.

---

### 6.4 Forecasting Strategy

The system uses **iterative multi-step forecasting** to generate N future daily predictions:

```python
for day in range(1, forecast_days + 1):
    # 1. Create a row for the next date with placeholder quantity = 0
    # 2. Concatenate with running history
    # 3. Compute all 18 features on the combined series
    # 4. Extract the feature row for the forecast date
    # 5. Predict demand → XGBRegressor.predict(features)
    # 6. Clamp to 0 (no negative demand)
    # 7. Append predicted value to history (used as lag for next day)
    # 8. Repeat
```

This allows the model to produce 7-day or 30-day forecasts while maintaining temporal consistency — each day's prediction becomes the "lag" input for the next day's prediction.

#### Fallback Forecasting

If the ML model is unavailable or a product has fewer than 7 historical data points, the system automatically falls back to a **7-day moving average**:

```
fallback_prediction = mean(last 7 days of actual sales)
```

All API responses include `is_fallback: true` when the fallback is used, so the frontend can display a disclaimer.

---

### 6.5 Model Accuracy & Evaluation Metrics

Demand forecasting is a **regression problem**, not a classification problem. We therefore do not report "accuracy %" in the traditional sense. Instead, we use three complementary regression metrics:

---

#### MAE — Mean Absolute Error

```
MAE = (1/n) × Σ|y_actual - y_predicted|
```

**What it means:** On average, our predictions are off by `MAE` units per day.

**Example:** MAE = 2.221 means on an average day, the model's forecast is off by ~2.2 units.

**Why we use it:** Easy to interpret in the same units as demand (units/day). Not sensitive to outliers. Business teams can immediately understand "we're typically off by about 2 units per day."

---

#### RMSE — Root Mean Squared Error

```
RMSE = √( (1/n) × Σ(y_actual - y_predicted)² )
```

**What it means:** Similar to MAE but penalises large errors more heavily (due to squaring).

**Example:** RMSE = 2.946. Because RMSE > MAE, this confirms there are some days with larger prediction errors pulling RMSE up, but the typical error remains small.

**Why we use it:** Reveals whether errors are consistent or whether there are occasional large misfires. A high RMSE relative to MAE signals occasional extreme prediction mistakes.

---

#### MAPE — Mean Absolute Percentage Error (Zero-Safe)

```
MAPE = (100/n) × Σ( |y_actual - y_predicted| ÷ max(|y_actual|, 1) )
```

**What it means:** The average percentage by which our predictions deviate from actual demand.

**Why `max(|y_actual|, 1)`?** Standard MAPE is undefined when actual demand is 0 (division by zero). We use `max(|y_actual|, 1)` to safely handle zero-demand days (common in low-volume products).

**Example:** MAPE = 43.1% means on average we're ~43% off from actual demand.

> **Context:** A MAPE of 43% sounds high, but for short-history (~90 days), multi-product, irregular retail demand with frequent zero-sale days, it is within industry-standard acceptable range. Products with consistent high volume (Wireless Mouse, Keyboards) show much lower per-product MAPE. The headline MAPE is inflated by zero-demand days in low-volume products.

---

#### Current Model Performance (version `xgb-v1-20260923-183210`)

| Metric | Value | Interpretation |
|---|---|---|
| **MAE** | 2.221 units/day | Typical daily prediction error is ~2.2 units |
| **RMSE** | 2.946 units/day | Occasional larger errors but no extreme misfires |
| **MAPE** | 43.1% | 43% relative error (high due to zero-demand days in low-volume SKUs) |

**Improvement vs. previous version:**

| Metric | Previous Model | Current Model | Improvement |
|---|---|---|---|
| MAE | 3.097 | **2.221** | ↓ 28% better |
| RMSE | 3.879 | **2.946** | ↓ 24% better |
| MAPE | 59.4% | **43.1%** | ↓ 16 pp better |

---

### 6.6 Inventory Calculations Using ML Output

The ML predicted daily demand feeds directly into supply chain formulas:

#### Safety Stock

Protects against demand variability and supply disruptions:

```
Safety Stock = Z × σ_demand × √(leadTimeDays)

Where:
  Z             = 1.65  (95% cycle service level)
  σ_demand      = standard deviation of daily demand (from 30 days history)
  leadTimeDays  = supplier lead time (from supplier record)

Fallback (< 14 data points):
  Safety Stock = max(1, ceil(minimumStock × 0.5))
```

#### Reorder Point (ROP)

The stock level at which a replenishment order should be placed:

```
expectedLeadTimeDemand = predictedDailyDemand × leadTimeDays
ROP = expectedLeadTimeDemand + safetyStock
```

#### Recommended Order Quantity (ROQ)

How many units to order right now:

```
targetRequirement = ROP + expectedLeadTimeDemand
totalAvailable    = currentStock + pendingIncomingQuantity
ROQ               = max(0, targetRequirement - totalAvailable)
```

#### Days Until Stock-Out

```
daysUntilStockOut = currentStock ÷ max(predictedDailyDemand, 0.1)
```

---

## 7. API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `POST` | `/api/auth/register` | Register new user (admin only) |
| `GET` | `/api/auth/me` | Current user profile |

### Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List products (search, category, status, pagination) |
| `POST` | `/api/products` | Create product |
| `GET` | `/api/products/:id` | Get product by ID |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Delete product |

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/inventory` | All products with live inventory metrics |
| `GET` | `/api/inventory/:productId` | Single product inventory detail |
| `POST` | `/api/inventory/adjust` | Manual stock adjustment |
| `GET` | `/api/inventory/alerts` | Products below reorder point |

### Sales

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sales` | List sales (customer filter, pagination) |
| `POST` | `/api/sales` | Record new sale (decrements stock) |
| `GET` | `/api/sales/:id` | Get sale by ID |

### Purchases

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/purchases` | List POs (status filter, pagination) |
| `POST` | `/api/purchases` | Create purchase order |
| `GET` | `/api/purchases/:id` | Get PO by ID |
| `PATCH` | `/api/purchases/:id/receive` | Receive goods (increments stock) |
| `PATCH` | `/api/purchases/:id/cancel` | Cancel PO |

### ML & Forecasting

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/ml/health` | ML service health check |
| `GET` | `/api/ml/status` | Current model version and metrics |
| `POST` | `/api/ml/train` | Trigger model retraining |
| `GET` | `/api/forecast/:productId` | Forecast for one product (with ROP/ROQ/Risk) |
| `GET` | `/api/forecast` | Forecast all products |
| `GET` | `/api/insights` | Generate AI inventory insights |
| `GET` | `/api/insights/summary` | Insights count by severity |
| `GET` | `/api/anomalies` | Detect sales anomalies (threshold, days, productId) |

---

## 8. Project Structure

```
Inventory Management/
├── docker-compose.yml          # All 4 services
├── .env.example                # Environment variable template
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── pages/              # One component per sidebar route
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── SuppliersPage.tsx
│   │   │   ├── SalesPage.tsx
│   │   │   ├── PurchasesPage.tsx
│   │   │   ├── ForecastPage.tsx
│   │   │   ├── AnomaliesPage.tsx
│   │   │   └── InsightsPage.tsx
│   │   ├── services/           # Typed Axios API clients per domain
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── components/         # Shared UI (Sidebar, Navbar, Badges)
│   │   └── types/index.ts      # All TypeScript interfaces
│   └── Dockerfile
│
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Product.ts
│   │   │   ├── Supplier.ts
│   │   │   ├── Sale.ts
│   │   │   ├── Purchase.ts
│   │   │   └── InventoryEvent.ts
│   │   ├── controllers/        # Request handlers
│   │   ├── services/           # Business logic
│   │   │   ├── forecastService.ts          # ML demand → ROP/ROQ/Risk
│   │   │   ├── inventoryCalculationService.ts # Safety stock formulas
│   │   │   ├── insightsService.ts          # AI insight generation
│   │   │   ├── anomalyService.ts           # Z-score detection
│   │   │   └── mlClientService.ts          # FastAPI proxy client
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # Auth, error handling
│   │   ├── validators/         # Zod schemas
│   │   └── utils/seed.ts       # Database seed script
│   └── Dockerfile
│
└── ml-service/                 # Python FastAPI ML microservice
    ├── main.py                 # FastAPI app + endpoints
    ├── src/
    │   ├── preprocessing.py    # CSV loading, cleaning, zero-fill
    │   ├── features.py         # 18-feature engineering (no leakage)
    │   ├── train.py            # 8-step XGBoost training pipeline
    │   ├── forecasting.py      # Iterative multi-step forecasting
    │   └── evaluation.py       # MAE, RMSE, MAPE metrics
    ├── models/                 # Saved model files (demand_model.joblib)
    ├── data/                   # Sample training CSV
    └── Dockerfile
```

---

## 9. Database Seed Data

Running the seed script generates the following demo dataset:

| Collection | Count | Details |
|---|---|---|
| **Users** | 3 | Admin, Manager, Staff |
| **Suppliers** | 5 | TechVision Electronics, Global Peripherals, Network Pro, Premium Office Supplies, Furniture World |
| **Products** | 15 | Electronics (5), Accessories (3), Networking (2), Office Supplies (3), Furniture (2) |
| **Sales** | 1,929 | 90 days of historical transactions with realistic demand patterns per SKU |
| **Purchases** | 57 | Mix of `received` (52) and `pending` (5) POs across all suppliers |
| **Inventory Events** | 1,929 | One event per sale for full audit trail |

The seed uses a **deterministic random number generator** (seed = 42) so results are exactly reproducible across environments.

---

*Built with ❤️ — InventoryAI Enterprise SaaS Platform*
