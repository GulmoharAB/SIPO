import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IncidentTable = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/incidents`);
      
      if (response.data && response.data.incidents) {
        setIncidents(response.data.incidents);
        calculateStats(response.data.incidents);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incidents. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (incidentData) => {
    const totalIncidents = incidentData.length;
    const totalAlerts = incidentData.reduce((sum, incident) => sum + incident.alert_count, 0);
    const totalCustomers = incidentData.reduce((sum, incident) => sum + incident.total_customers, 0);
    const totalRevenue = incidentData.reduce((sum, incident) => sum + incident.total_revenue_risk, 0);
    
    const priorityCounts = incidentData.reduce((counts, incident) => {
      counts[incident.priority] = (counts[incident.priority] || 0) + 1;
      return counts;
    }, {});

    setStats({
      totalIncidents,
      totalAlerts,
      totalCustomers,
      totalRevenue,
      priorityCounts,
      reductionRate: totalAlerts > 0 ? ((totalAlerts - totalIncidents) / totalAlerts * 100).toFixed(1) : 0
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-gray-600">Loading incidents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchIncidents}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{stats.totalIncidents}</div>
          <div className="text-sm text-blue-700">Total Incidents</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{stats.reductionRate}%</div>
          <div className="text-sm text-green-700">Alert Reduction</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{formatNumber(stats.totalCustomers)}</div>
          <div className="text-sm text-orange-700">Customers Affected</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-sm text-red-700">Revenue at Risk</div>
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Priority Distribution</h3>
        <div className="flex space-x-4">
          {Object.entries(stats.priorityCounts || {}).map(([priority, count]) => (
            <div key={priority} className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeClass(priority)}`}>
                {priority}
              </span>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Incident Details</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incident ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primary Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affected Devices
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidents.map((incident) => (
                <tr key={incident.incident_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{incident.incident_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityBadgeClass(incident.priority)}`}>
                      {incident.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                      {incident.primary_error}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {incident.alert_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(incident.total_customers)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(incident.total_revenue_risk)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex flex-wrap gap-1">
                      {incident.affected_devices.slice(0, 3).map((device, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {device}
                        </span>
                      ))}
                      {incident.affected_devices.length > 3 && (
                        <span className="text-gray-500 text-xs">
                          +{incident.affected_devices.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchIncidents}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default IncidentTable;
