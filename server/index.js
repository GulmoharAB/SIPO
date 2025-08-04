const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Mock Prometheus alerts data (1,000 alerts as specified)
const generateMockPrometheusAlerts = () => {
  const alerts = [];
  const devices = ['T1', 'T2', 'T3', 'R1', 'R2', 'R3'];
  const errorCodes = ['BGP_FAIL', 'LINK_DOWN', 'HARDWARE_FAIL', 'POWER_FAIL', 'FIBER_CUT', 'OVERLOAD'];
  
  for (let i = 0; i < 1000; i++) {
    alerts.push({
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      device_id: devices[Math.floor(Math.random() * devices.length)],
      error_code: errorCodes[Math.floor(Math.random() * errorCodes.length)],
      customer_impact: Math.floor(Math.random() * 10000) + 1,
      revenue_risk: Math.floor(Math.random() * 1000000) + 1000
    });
  }
  
  return alerts;
};

// Routes

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'SIPO Backend API is running',
    version: '1.0.0',
    endpoints: ['/upload-csv', '/prometheus-alerts', '/incidents', '/root-cause', '/paths']
  });
});

// Upload and parse CSV endpoint
app.post('/upload-csv', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const alerts = [];
    const filePath = req.file.path;

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(parse({ 
        headers: true,
        skip_empty_lines: true 
      }))
      .on('data', (row) => {
        // Validate and transform row data
        const alert = {
          timestamp: row.timestamp,
          device_id: row.device_id,
          error_code: row.error_code,
          customer_impact: parseInt(row.customer_impact) || 0,
          revenue_risk: parseInt(row.revenue_risk) || 0
        };
        alerts.push(alert);
      })
      .on('end', () => {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json({ 
          message: `Successfully parsed ${alerts.length} alerts`,
          alerts: alerts
        });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Mock Prometheus alerts endpoint
app.get('/prometheus-alerts', (req, res) => {
  try {
    const alerts = generateMockPrometheusAlerts();
    res.json({ 
      message: `Retrieved ${alerts.length} alerts from Prometheus`,
      alerts: alerts
    });
  } catch (error) {
    console.error('Prometheus alerts error:', error);
    res.status(500).json({ error: 'Failed to retrieve Prometheus alerts' });
  }
});

// Incidents endpoint (will be populated by ML correlation)
app.get('/incidents', (req, res) => {
  try {
    // Load alerts from CSV file
    const alertsPath = path.join(__dirname, '..', 'data', 'alerts.csv');
    
    if (!fs.existsSync(alertsPath)) {
      return res.status(404).json({ error: 'Alerts data not found. Please generate alerts first.' });
    }

    const alerts = [];
    fs.createReadStream(alertsPath)
      .pipe(parse({ 
        headers: true,
        skip_empty_lines: true 
      }))
      .on('data', (row) => {
        alerts.push({
          timestamp: row.timestamp,
          device_id: row.device_id,
          error_code: row.error_code,
          customer_impact: parseInt(row.customer_impact) || 0,
          revenue_risk: parseInt(row.revenue_risk) || 0
        });
      })
      .on('end', () => {
        // Mock incident correlation (will be replaced by ML)
        const incidents = mockIncidentCorrelation(alerts);
        res.json({ 
          message: `Correlated ${alerts.length} alerts into ${incidents.length} incidents`,
          incidents: incidents
        });
      })
      .on('error', (error) => {
        console.error('Error reading alerts:', error);
        res.status(500).json({ error: 'Failed to load alerts data' });
      });

  } catch (error) {
    console.error('Incidents error:', error);
    res.status(500).json({ error: 'Failed to retrieve incidents' });
  }
});

// Mock incident correlation function (placeholder for ML)
function mockIncidentCorrelation(alerts) {
  const incidents = [];
  const incidentSize = Math.ceil(alerts.length / 15); // Group into ~15 incidents
  
  for (let i = 0; i < alerts.length; i += incidentSize) {
    const incidentAlerts = alerts.slice(i, i + incidentSize);
    const totalCustomers = incidentAlerts.reduce((sum, alert) => sum + alert.customer_impact, 0);
    const totalRevenueRisk = incidentAlerts.reduce((sum, alert) => sum + alert.revenue_risk, 0);
    
    // Determine priority based on revenue risk
    let priority = 'Low';
    if (totalRevenueRisk > 500000) priority = 'High';
    else if (totalRevenueRisk > 100000) priority = 'Medium';
    
    incidents.push({
      incident_id: incidents.length + 1,
      alert_count: incidentAlerts.length,
      alerts: incidentAlerts,
      priority: priority,
      total_customers: totalCustomers,
      total_revenue_risk: totalRevenueRisk,
      primary_error: incidentAlerts[0].error_code,
      affected_devices: [...new Set(incidentAlerts.map(a => a.device_id))]
    });
  }
  
  // Sort by revenue risk (highest first)
  return incidents.sort((a, b) => b.total_revenue_risk - a.total_revenue_risk);
}

// Root cause endpoint (placeholder for Feature 2)
app.get('/root-cause', (req, res) => {
  res.json({ 
    message: 'Root cause analysis endpoint - Feature 2 implementation pending',
    incidents: []
  });
});

// Paths endpoint (placeholder for Feature 3)
app.get('/paths', (req, res) => {
  res.json({ 
    message: 'Path optimization endpoint - Feature 3 implementation pending',
    paths: []
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`SIPO Backend API running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /                 - Health check`);
  console.log(`  POST /upload-csv       - Upload and parse CSV alerts`);
  console.log(`  GET  /prometheus-alerts - Mock Prometheus alerts`);
  console.log(`  GET  /incidents        - Correlated incidents`);
  console.log(`  GET  /root-cause       - Root cause analysis (Feature 2)`);
  console.log(`  GET  /paths           - Path optimization (Feature 3)`);
});

module.exports = app;
