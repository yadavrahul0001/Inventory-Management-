import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ProductsPage from './pages/ProductsPage';
import SuppliersPage from './pages/SuppliersPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ForecastPage from './pages/ForecastPage';
import AnomaliesPage from './pages/AnomaliesPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'dark:bg-gray-800 dark:text-white text-sm font-medium',
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />

          <Routes>
            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback routes */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
