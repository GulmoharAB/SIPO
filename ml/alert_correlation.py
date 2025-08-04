#!/usr/bin/env python3
"""
Alert Correlation using DBSCAN clustering
Groups 1,000 alerts into 10-20 incidents and prioritizes by revenue risk
"""

import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import silhouette_score
import json
import os
from datetime import datetime

class AlertCorrelator:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.clusterer = None
        
    def load_alerts(self, csv_path):
        """Load alerts from CSV file"""
        try:
            df = pd.read_csv(csv_path)
            print(f"Loaded {len(df)} alerts from {csv_path}")
            return df
        except Exception as e:
            print(f"Error loading alerts: {e}")
            return None
    
    def preprocess_features(self, df):
        """Preprocess alert features for clustering"""
        # Create a copy for processing
        processed_df = df.copy()
        
        # Convert timestamp to numeric features
        processed_df['timestamp'] = pd.to_datetime(processed_df['timestamp'])
        processed_df['hour'] = processed_df['timestamp'].dt.hour
        processed_df['day_of_week'] = processed_df['timestamp'].dt.dayofweek
        
        # Encode categorical features
        categorical_cols = ['device_id', 'error_code']
        for col in categorical_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
            processed_df[f'{col}_encoded'] = self.label_encoders[col].fit_transform(processed_df[col])
        
        # Select features for clustering
        feature_cols = [
            'device_id_encoded', 'error_code_encoded', 
            'customer_impact', 'revenue_risk',
            'hour', 'day_of_week'
        ]
        
        # Normalize features
        features = processed_df[feature_cols].values
        features_scaled = self.scaler.fit_transform(features)
        
        return features_scaled, processed_df
    
    def find_optimal_eps(self, features, min_samples=5):
        """Find optimal eps parameter for DBSCAN using k-distance graph"""
        from sklearn.neighbors import NearestNeighbors
        
        # Calculate k-distances
        neighbors = NearestNeighbors(n_neighbors=min_samples)
        neighbors_fit = neighbors.fit(features)
        distances, indices = neighbors_fit.kneighbors(features)
        
        # Sort distances to the k-th nearest neighbor
        distances = np.sort(distances[:, min_samples-1], axis=0)
        
        # Use the elbow method - find point of maximum curvature
        # For simplicity, use 75th percentile of distances
        optimal_eps = np.percentile(distances, 75)
        
        return optimal_eps
    
    def cluster_alerts(self, features, eps=None, min_samples=5):
        """Cluster alerts using DBSCAN"""
        if eps is None:
            eps = self.find_optimal_eps(features, min_samples)
        
        print(f"Using DBSCAN with eps={eps:.3f}, min_samples={min_samples}")
        
        # Apply DBSCAN clustering
        self.clusterer = DBSCAN(eps=eps, min_samples=min_samples)
        cluster_labels = self.clusterer.fit_predict(features)
        
        # Calculate clustering metrics
        n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        n_noise = list(cluster_labels).count(-1)
        
        print(f"Found {n_clusters} clusters with {n_noise} noise points")
        
        if n_clusters > 1:
            silhouette_avg = silhouette_score(features, cluster_labels)
            print(f"Silhouette Score: {silhouette_avg:.3f}")
        
        return cluster_labels
    
    def create_incidents(self, df, cluster_labels):
        """Create incident summaries from clustered alerts"""
        incidents = []
        
        # Add cluster labels to dataframe
        df_clustered = df.copy()
        df_clustered['cluster'] = cluster_labels
        
        # Group by cluster (exclude noise points with label -1)
        for cluster_id in sorted(set(cluster_labels)):
            if cluster_id == -1:  # Skip noise points
                continue
                
            cluster_alerts = df_clustered[df_clustered['cluster'] == cluster_id]
            
            # Calculate incident metrics
            total_customers = int(cluster_alerts['customer_impact'].sum())
            total_revenue_risk = int(cluster_alerts['revenue_risk'].sum())
            alert_count = len(cluster_alerts)
            
            # Determine priority based on revenue risk
            if total_revenue_risk > 500000:
                priority = 'High'
            elif total_revenue_risk > 100000:
                priority = 'Medium'
            else:
                priority = 'Low'
            
            # Get most common error code and affected devices
            primary_error = cluster_alerts['error_code'].mode().iloc[0]
            affected_devices = sorted(cluster_alerts['device_id'].unique().tolist())
            
            # Create incident summary
            incident = {
                'incident_id': len(incidents) + 1,
                'alert_count': alert_count,
                'alerts': cluster_alerts.drop(['cluster'], axis=1).to_dict('records'),
                'priority': priority,
                'total_customers': total_customers,
                'total_revenue_risk': total_revenue_risk,
                'primary_error': primary_error,
                'affected_devices': affected_devices,
                'start_time': cluster_alerts['timestamp'].min(),
                'end_time': cluster_alerts['timestamp'].max()
            }
            
            incidents.append(incident)
        
        # Handle noise points as individual incidents if any
        noise_alerts = df_clustered[df_clustered['cluster'] == -1]
        for idx, alert in noise_alerts.iterrows():
            incident = {
                'incident_id': len(incidents) + 1,
                'alert_count': 1,
                'alerts': [alert.drop(['cluster']).to_dict()],
                'priority': 'Low',
                'total_customers': int(alert['customer_impact']),
                'total_revenue_risk': int(alert['revenue_risk']),
                'primary_error': alert['error_code'],
                'affected_devices': [alert['device_id']],
                'start_time': alert['timestamp'],
                'end_time': alert['timestamp']
            }
            incidents.append(incident)
        
        # Sort incidents by revenue risk (highest first)
        incidents.sort(key=lambda x: x['total_revenue_risk'], reverse=True)
        
        return incidents
    
    def correlate_alerts(self, csv_path, output_path=None):
        """Main function to correlate alerts and create incidents"""
        # Load alerts
        df = self.load_alerts(csv_path)
        if df is None:
            return None
        
        # Preprocess features
        features, processed_df = self.preprocess_features(df)
        
        # Cluster alerts
        cluster_labels = self.cluster_alerts(features)
        
        # Create incidents
        incidents = self.create_incidents(processed_df, cluster_labels)
        
        # Print summary
        print(f"\nAlert Correlation Summary:")
        print(f"  Original alerts: {len(df)}")
        print(f"  Incidents created: {len(incidents)}")
        print(f"  Alert reduction: {(1 - len(incidents)/len(df))*100:.1f}%")
        
        priority_counts = {}
        for incident in incidents:
            priority = incident['priority']
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        print(f"  Priority distribution:")
        for priority, count in sorted(priority_counts.items()):
            print(f"    {priority}: {count}")
        
        # Save results if output path provided
        if output_path:
            self.save_incidents(incidents, output_path)
        
        return incidents
    
    def save_incidents(self, incidents, output_path):
        """Save incidents to JSON file"""
        try:
            # Convert datetime objects to strings for JSON serialization
            incidents_json = []
            for incident in incidents:
                incident_copy = incident.copy()
                incident_copy['start_time'] = str(incident_copy['start_time'])
                incident_copy['end_time'] = str(incident_copy['end_time'])
                
                # Convert alert timestamps to strings
                for alert in incident_copy['alerts']:
                    if 'timestamp' in alert:
                        alert['timestamp'] = str(alert['timestamp'])
                
                incidents_json.append(incident_copy)
            
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'total_incidents': len(incidents_json),
                    'incidents': incidents_json
                }, f, indent=2)
            
            print(f"Incidents saved to {output_path}")
            
        except Exception as e:
            print(f"Error saving incidents: {e}")

def main():
    """Main execution function"""
    # Initialize correlator
    correlator = AlertCorrelator()
    
    # Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    alerts_path = os.path.join(script_dir, '..', 'data', 'alerts.csv')
    output_path = os.path.join(script_dir, '..', 'data', 'incidents.json')
    
    # Correlate alerts
    incidents = correlator.correlate_alerts(alerts_path, output_path)
    
    if incidents:
        print(f"\nTop 5 High Priority Incidents:")
        high_priority = [i for i in incidents if i['priority'] == 'High'][:5]
        for incident in high_priority:
            print(f"  Incident #{incident['incident_id']}: {incident['primary_error']} - "
                  f"{incident['total_customers']:,} customers, "
                  f"${incident['total_revenue_risk']:,} risk")

if __name__ == "__main__":
    main()
