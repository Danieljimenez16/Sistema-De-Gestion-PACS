import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '../layout/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AssetsPage } from '../pages/AssetsPage';
import { AssetDetailPage } from '../pages/AssetDetailPage';
import { LicensesPage } from '../pages/LicensesPage';
import { AuditPage } from '../pages/AuditPage';
import { ReportsPage } from '../pages/ReportsPage';
import { UsersPage } from '../pages/UsersPage';
import { CatalogsPage } from '../pages/CatalogsPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { useAuth } from '../context/AuthContext';

// Admin guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/change-password', element: <ChangePasswordPage forced /> },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'assets/:id', element: <AssetDetailPage /> },
      { path: 'licenses', element: <LicensesPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'reports', element: <ReportsPage /> },
      {
        path: 'users',
        element: <AdminRoute><UsersPage /></AdminRoute>,
      },
      {
        path: 'catalogs',
        element: <AdminRoute><CatalogsPage /></AdminRoute>,
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
