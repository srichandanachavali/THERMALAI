import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [reactors, setReactors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mlStatus, setMlStatus] = useState('ok');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('thermalai_token') || localStorage.getItem('token');
    if (!token) {
      // No token — don't attempt socket connection. Login page handles redirect.
      return;
    }

    const newSocket = io(API, { auth: { token } });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to ThermalAI backend');
      setConnected(true);
      setAuthError(false);
    });

    newSocket.on('connect_error', (err) => {
      if (err && (err.message === 'unauthorized' || err.message === 'server misconfigured')) {
        console.warn('🚫 Socket auth failed — clearing token');
        localStorage.removeItem('thermalai_token');
        localStorage.removeItem('token');
        setAuthError(true);
        // Force reload to login page. Router will pick up cleared token.
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    });

    newSocket.on('reactor_update', (data) => {
      setReactors(prev => {
        const existing = prev.findIndex(r => r.reactor_id === data.reactor_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    newSocket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    newSocket.on('system_alert', (data) => {
      if (data.type === 'ML_DOWN') {
        console.warn('🚨 ML service is DOWN:', data.message);
        setMlStatus('down');
      } else if (data.type === 'ML_RECOVERED') {
        console.log('✅ ML service recovered');
        setMlStatus('ok');
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    return () => newSocket.close();
    // Re-run when the token changes (login/logout via storage event or page reload)
  }, []);

  return (
    <SocketContext.Provider value={{ socket, reactors, alerts, connected, mlStatus, authError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
