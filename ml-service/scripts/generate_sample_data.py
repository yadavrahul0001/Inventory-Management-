import csv
import random
from datetime import datetime, timedelta
import math
import os

def generate_sample_sales():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    output_file = os.path.join(data_dir, "sample_sales.csv")

    products = {
        "MOUSE001": {"base": 11, "price": 25.99, "trend": True, "weekend_dip": True},
        "KEYB001": {"base": 7, "price": 45.50, "trend": False, "weekend_dip": False},
        "MON001": {"base": 3, "price": 199.99, "trend": False, "weekend_dip": False, "q1_q4_high": True},
        "HEAD001": {"base": 5, "price": 59.99, "trend": False, "weekend_dip": False, "spiky": True},
        "WEBCAM001": {"base": 5, "price": 89.00, "trend": False, "weekend_dip": False, "summer_peak": True},
    }

    start_date = datetime(2025, 1, 1)
    days = 365

    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["date", "product_id", "quantity", "price"])

        for i in range(days):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime("%Y-%m-%d")
            day_of_week = current_date.weekday()
            month = current_date.month

            for product_id, props in products.items():
                base = props["base"]
                qty = base
                
                if props.get("trend"):
                    qty += (i / days) * 4 # slight upward trend
                
                if props.get("weekend_dip") and day_of_week >= 5:
                    qty -= 4
                
                if props.get("q1_q4_high"):
                    if month in [1, 2, 3, 10, 11, 12]:
                        qty += 2
                
                if props.get("summer_peak"):
                    if month in [6, 7, 8]:
                        qty += 4
                
                if props.get("spiky") and random.random() < 0.1:
                    qty += 15 # spike
                
                # Add some random noise
                qty += random.uniform(-1, 1)
                
                final_qty = max(0, int(round(qty)))
                
                if final_qty > 0: # Only write if sold
                    writer.writerow([date_str, product_id, final_qty, props["price"]])
                    
    print(f"Generated sample sales data at {output_file}")

if __name__ == "__main__":
    generate_sample_sales()
