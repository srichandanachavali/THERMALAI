import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SocketProvider, useSocket } from "./context/SocketContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import ReactorDetail from "./pages/ReactorDetail";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import MultiPlant from "./pages/MultiPlant";
import Login from "./pages/Login";
import PlantSelect from "./pages/PlantSelect";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("thermalai_token");
  if (!token) return <Navigate to="/select-plant" />;
  return children;
};

// ── ML status banner — shown on every protected page when ML is down ──
const MLStatusBanner = () => {
  const { mlStatus } = useSocket();
  if (mlStatus !== "down") return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2 text-center">
      <span>⚠️</span>
      <span>
        ML prediction service is DOWN — risk scores may be inaccurate.
        Engineering team has been notified.
      </span>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/select-plant" element={<PlantSelect />} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <div className="flex flex-col bg-gray-900 min-h-screen">
                  {/* ML warning banner sits above everything */}
                  <MLStatusBanner />
                  <div className="flex flex-1">
                    <Sidebar />
                    <div className="flex-1 ml-64 p-6">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/plants" element={<MultiPlant />} />
                        <Route
                          path="/reactor/:id"
                          element={<ReactorDetail />}
                        />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/analytics/:id" element={<Analytics />} />
                      </Routes>
                    </div>
                  </div>
                </div>
              </SocketProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
