import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './routes';

const App: React.FC = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;
