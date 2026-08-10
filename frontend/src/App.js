import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { SocketProvider, useSocket } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ReactorDetail from "./pages/ReactorDetail";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import MultiPlant from "./pages/MultiPlant";
import Login from "./pages/Login";
import PlantSelect from "./pages/PlantSelect";
import Settings from "./pages/Settings";

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
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2 text-center"
    >
      <FiAlertTriangle size={16} aria-hidden="true" />
      <span>
        ML prediction service is DOWN — risk scores may be inaccurate.
        Engineering team has been notified.
      </span>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/select-plant" element={<ErrorBoundary><PlantSelect /></ErrorBoundary>} />
        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
                  {/* ML warning banner sits above everything */}
                  <MLStatusBanner />
                  <div className="flex flex-1">
                    <Sidebar />
                    <main role="main" className="flex-1 ml-[220px] p-6">
                      <Routes>
                        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
                        <Route path="/plants" element={<ErrorBoundary><MultiPlant /></ErrorBoundary>} />
                        <Route
                          path="/reactor/:id"
                          element={<ErrorBoundary><ReactorDetail /></ErrorBoundary>}
                        />
                        <Route path="/alerts" element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
                        <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                        <Route path="/analytics/:id" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                        <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </SocketProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
