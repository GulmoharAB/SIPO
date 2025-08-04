#!/usr/bin/env python3
"""
Generate synthetic 5G alert data for SIPO PoC
Creates 1,000 alerts with 10% BGP failures as specified in Master_plan
"""

import csv
import random
from datetime import datetime, timedelta
import os

def generate_alerts():
    """Generate 1,000 synthetic 5G alerts with specified distribution"""
    
    # Alert configuration
    num_alerts = 1000
    bgp_failure_rate = 0.10  # 10% BGP failures as specified
    
    # Device IDs (towers and routers)
    towers = [f"T{i}" for i in range(1, 21)]  # T1-T20
    routers = [f"R{i}" for i in range(1, 11)]  # R1-R10
    devices = towers + routers
    
    # Error codes with weighted distribution
    error_codes = [
        ("BGP_FAIL", 0.10),      # 10% BGP failures
        ("LINK_DOWN", 0.15),     # 15% link failures
        ("HARDWARE_FAIL", 0.10), # 10% hardware failures
        ("POWER_FAIL", 0.08),    # 8% power failures
        ("FIBER_CUT", 0.12),     # 12% fiber cuts
        ("OVERLOAD", 0.20),      # 20% overload issues
        ("CONFIG_ERROR", 0.10),  # 10% config errors
        ("TIMEOUT", 0.15)        # 15% timeouts
    ]
    
    alerts = []
    base_time = datetime.now() - timedelta(hours=24)
    
    for i in range(num_alerts):
        # Generate timestamp (last 24 hours)
        timestamp = base_time + timedelta(minutes=random.randint(0, 1440))
        
        # Select error code based on weighted distribution
        rand_val = random.random()
        cumulative = 0
        selected_error = "BGP_FAIL"  # default
        
        for error_code, weight in error_codes:
            cumulative += weight
            if rand_val <= cumulative:
                selected_error = error_code
                break
        
        # Generate alert data
        alert = {
            'timestamp': timestamp.isoformat(),
            'device_id': random.choice(devices),
            'error_code': selected_error,
            'customer_impact': random.randint(1, 10000),
            'revenue_risk': random.randint(1000, 1000000)  # $1K to $1M
        }
        
        alerts.append(alert)
    
    return alerts

def save_alerts_to_csv(alerts, filename):
    """Save alerts to CSV file"""
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    fieldnames = ['timestamp', 'device_id', 'error_code', 'customer_impact', 'revenue_risk']
    
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(alerts)
    
    print(f"Generated {len(alerts)} alerts and saved to {filename}")
    
    # Print summary statistics
    error_counts = {}
    for alert in alerts:
        error_code = alert['error_code']
        error_counts[error_code] = error_counts.get(error_code, 0) + 1
    
    print("\nAlert distribution:")
    for error_code, count in sorted(error_counts.items()):
        percentage = (count / len(alerts)) * 100
        print(f"  {error_code}: {count} ({percentage:.1f}%)")

if __name__ == "__main__":
    # Generate alerts
    alerts = generate_alerts()
    
    # Save to data directory
    output_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'alerts.csv')
    save_alerts_to_csv(alerts, output_file)
