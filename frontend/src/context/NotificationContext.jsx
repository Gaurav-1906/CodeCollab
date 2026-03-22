import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map(n => (
        <Toast key={n.id} message={n.message} type={n.type} duration={n.duration} onClose={() => {}} />
      ))}
    </NotificationContext.Provider>
  );
};