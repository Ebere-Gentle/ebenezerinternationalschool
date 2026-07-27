import React, { createContext, useContext, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);
  const showInfo = (message: string) => toast(message);
  const showWarning = (message: string) => toast(message, { icon: '⚠️' });

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showInfo, showWarning }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
