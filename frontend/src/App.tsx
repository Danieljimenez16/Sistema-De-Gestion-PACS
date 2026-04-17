import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { AppRouter } from './routes';

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  </AuthProvider>
);

export default App;
