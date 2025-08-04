import React from 'react';
import IncidentTable from './components/IncidentTable';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">
            SIPO - Smart Incident Prioritizer & Path Optimizer
          </h1>
          <p className="text-blue-200 mt-2">
            Telecom AIOps Demo - Reducing Alert Noise by 50-70%
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Incident Dashboard
            </h2>
            <p className="text-gray-600">
              Correlated incidents from 5G network alerts - Dallas NOC
            </p>
          </div>
          
          {/* Incident Table Component */}
          <IncidentTable />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 SIPO PoC - Verizon NOC Demo</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
