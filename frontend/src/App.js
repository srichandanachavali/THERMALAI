import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import ReactorDetail from './pages/ReactorDetail';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import MultiPlant from './pages/MultiPlant';
import Login from './pages/Login';
import PlantSelect from './pages/PlantSelect';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('thermalai_token');
  if (!token) return <Navigate to="/select-plant" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/select-plant" element={<PlantSelect />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <SocketProvider>
              <div className="flex bg-gray-900 min-h-screen">
                <Sidebar />
                <div className="flex-1 ml-64 p-6">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/plants" element={<MultiPlant />} />
                    <Route path="/reactor/:id" element={<ReactorDetail />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/analytics/:id" element={<Analytics />} />
                  </Routes>
                </div>
              </div>
            </SocketProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;