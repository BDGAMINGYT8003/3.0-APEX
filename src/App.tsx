import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Market } from './pages/Market';
import { Leaderboard } from './pages/Leaderboard';
import { Lottery } from './pages/Lottery';
import { Verify } from './pages/Verify';
import { Profile } from './pages/Profile';
import { RecentActivity } from './pages/RecentActivity';
import { PurchaseHistory } from './pages/PurchaseHistory';
import AdminSearch from './pages/AdminSearch';

import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile && !profile.isDiscordVerified) {
    return <Navigate to="/verify" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/verify" element={<Verify />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/market" element={<Market />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/lottery" element={<Lottery />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/recent-activity" element={<RecentActivity />} />
                <Route path="/purchase-history" element={<PurchaseHistory />} />
                <Route path="/admin/search" element={<AdminSearch />} />
                <Route path="/admin/search/:userId" element={<AdminSearch />} />
                <Route path="/admin/activity/:userId" element={<RecentActivity />} />
                <Route path="/admin/purchases/:userId" element={<PurchaseHistory />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
