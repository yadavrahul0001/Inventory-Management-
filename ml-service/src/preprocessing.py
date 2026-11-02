"""Data preprocessing module for demand forecasting pipeline."""

import pandas as pd
import numpy as np
import logging
from pathlib import Path
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


def load_sales_data(path: str) -> pd.DataFrame:
    """Load sales data from CSV file.

    Args:
        path: Path to CSV file with columns: date, product_id, quantity, price

    Returns:
        DataFrame with parsed dates and validated columns.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If required columns are missing.
    """
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Data file not found: {path}")

    df = pd.read_csv(path)

    required_columns = {"date", "product_id", "quantity", "price"}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["product_id", "date"]).reset_index(drop=True)

    logger.info(
        f"Loaded {len(df)} rows, {df['product_id'].nunique()} products, "
        f"date range: {df['date'].min()} to {df['date'].max()}"
    )
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean sales data: remove nulls/duplicates, clamp negatives.

    Args:
        df: Raw sales DataFrame.

    Returns:
        Cleaned DataFrame.
    """
    initial_len = len(df)

    # Drop rows with null values in critical columns
    df = df.dropna(subset=["date", "product_id", "quantity"])

    # Remove exact duplicates
    df = df.drop_duplicates()

    # Clamp negative quantities to 0
    df["quantity"] = df["quantity"].clip(lower=0)

    # Clamp negative prices to 0
    if "price" in df.columns:
        df["price"] = df["price"].clip(lower=0)

    dropped = initial_len - len(df)
    if dropped > 0:
        logger.info(f"Cleaned data: dropped {dropped} rows ({initial_len} -> {len(df)})")

    return df.reset_index(drop=True)


def validate_data(df: pd.DataFrame, min_rows: int = 30, min_days: int = 14) -> dict:
    """Validate data quality for ML training.

    Args:
        df: Cleaned sales DataFrame.
        min_rows: Minimum required rows.
        min_days: Minimum date span in days.

    Returns:
        Validation report dict with 'valid' bool and 'issues' list.
    """
    issues = []

    if len(df) < min_rows:
        issues.append(f"Insufficient rows: {len(df)} < {min_rows} minimum")

    if "date" in df.columns and len(df) > 0:
        date_range = (df["date"].max() - df["date"].min()).days
        if date_range < min_days:
            issues.append(f"Insufficient date span: {date_range} days < {min_days} minimum")

    if "quantity" in df.columns:
        zero_pct = (df["quantity"] == 0).mean()
        if zero_pct > 0.9:
            issues.append(f"Excessive zero quantities: {zero_pct:.1%}")

    product_counts = df.groupby("product_id").size()
    low_data_products = product_counts[product_counts < min_rows].index.tolist()
    if low_data_products:
        issues.append(
            f"{len(low_data_products)} product(s) have < {min_rows} rows: "
            f"{low_data_products[:5]}"
        )

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "num_rows": len(df),
        "num_products": df["product_id"].nunique(),
        "date_range_days": (df["date"].max() - df["date"].min()).days if len(df) > 0 else 0,
    }


def get_product_timeseries(
    df: pd.DataFrame, product_id: str, fill_missing: bool = True
) -> pd.DataFrame:
    """Extract a continuous daily time series for a single product.

    Args:
        df: Sales DataFrame.
        product_id: Product identifier to filter.
        fill_missing: If True, reindex to fill gaps with zero quantity.

    Returns:
        Daily time series DataFrame with columns: date, quantity, price.
    """
    product_df = df[df["product_id"] == product_id].copy()

    if product_df.empty:
        logger.warning(f"No data found for product: {product_id}")
        return pd.DataFrame(columns=["date", "quantity", "price"])

    # Aggregate same-day sales (sum quantity, mean price)
    daily = (
        product_df.groupby("date")
        .agg({"quantity": "sum", "price": "mean"})
        .reset_index()
    )

    if fill_missing and len(daily) > 1:
        # Create continuous date range
        full_range = pd.date_range(
            start=daily["date"].min(), end=daily["date"].max(), freq="D"
        )
        daily = daily.set_index("date").reindex(full_range).rename_axis("date").reset_index()

        # Fill missing days: 0 for quantity, forward-fill for price
        daily["quantity"] = daily["quantity"].fillna(0)
        daily["price"] = daily["price"].ffill().bfill()

    daily = daily.sort_values("date").reset_index(drop=True)
    return daily


def split_data(
    df: pd.DataFrame, test_ratio: float = 0.2
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Chronological train/test split (no shuffling to prevent data leakage).

    Args:
        df: DataFrame sorted by date.
        test_ratio: Fraction of data to use for testing.

    Returns:
        Tuple of (train_df, test_df).
    """
    if "date" in df.columns:
        df = df.sort_values("date").reset_index(drop=True)

    split_idx = int(len(df) * (1 - test_ratio))
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    logger.info(
        f"Train/test split: {len(train_df)} train, {len(test_df)} test "
        f"({test_ratio:.0%} test ratio)"
    )
    return train_df, test_df


if __name__ == "__main__":
    """Run preprocessing as a standalone script."""
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    data_path = sys.argv[1] if len(sys.argv) > 1 else "data/sample_sales.csv"
    logger.info(f"Preprocessing data from: {data_path}")

    df = load_sales_data(data_path)
    df = clean_data(df)
    report = validate_data(df)

    print(f"\nValidation Report:")
    print(f"  Valid: {report['valid']}")
    print(f"  Rows: {report['num_rows']}")
    print(f"  Products: {report['num_products']}")
    print(f"  Date range: {report['date_range_days']} days")
    if report["issues"]:
        print(f"  Issues:")
        for issue in report["issues"]:
            print(f"    - {issue}")

    # Show per-product stats
    for pid in df["product_id"].unique():
        ts = get_product_timeseries(df, pid)
        print(f"\n  {pid}: {len(ts)} days, avg daily demand = {ts['quantity'].mean():.1f}")
