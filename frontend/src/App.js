import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import ReactorDetail from "./pages/ReactorDetail";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="flex bg-gray-900 min-h-screen">
          <Sidebar />
          <div className="flex-1 ml-64 p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/reactor/:id" element={<ReactorDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/analytics/:id" element={<Analytics />} />
            </Routes>
          </div>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
