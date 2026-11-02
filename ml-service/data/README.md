# Dataset Directory

## Overview
This directory holds datasets used for training the demand forecasting model.

## Supported Datasets

### Option 1: UCI Online Retail Dataset
- **Download**: [UCI ML Repository](https://archive.ics.uci.edu/dataset/352/online+retail)
- **File**: `OnlineRetail.xlsx` or `OnlineRetail.csv`
- **Description**: Transactional data for a UK-based online retailer (2010-2011)
- **Columns**: InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country

### Option 2: M5 Walmart Forecasting Dataset
- **Download**: [Kaggle M5 Competition](https://www.kaggle.com/competitions/m5-forecasting-accuracy/data)
- **Files**: `sales_train_validation.csv`, `calendar.csv`, `sell_prices.csv`

### Option 3: Sample Dataset (Included)
A small synthetic dataset is provided at `sample_sales.csv` for local development and testing.

## Expected Format
The ML pipeline expects a CSV file with at minimum these columns:

| Column     | Type   | Description              |
|------------|--------|--------------------------|
| date       | string | Date in YYYY-MM-DD format |
| product_id | string | Unique product identifier |
| quantity   | int    | Units sold               |
| price      | float  | Unit selling price       |

## Setup Instructions
1. Download your chosen dataset
2. Place the file(s) in this `data/` directory
3. Run the preprocessing script: `python -m src.preprocessing`
4. Train the model: `python -m src.train` or use the `/train` API endpoint

## Sample Data
The `sample_sales.csv` file contains ~365 days of synthetic sales data for 5 products.
This is sufficient for development and testing but not for production-quality forecasts.
