import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [reactors, setReactors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to ThermalAI backend');
      setConnected(true);
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

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, reactors, alerts, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);