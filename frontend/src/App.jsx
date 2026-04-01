import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import SimpleLayout from "./components/SimpleLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import BookDetails from "./pages/BookDetails.jsx";
import Login from "./pages/Login.jsx";
import Verify from "./pages/Verify.jsx";
import Borrowed from "./pages/Borrowed.jsx";
import Reserved from "./pages/Reserved.jsx";
import Favorites from "./pages/Favorites.jsx";
import Donate from "./pages/Donate.jsx";
import Donations from "./pages/Donations.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Settings from "./pages/Settings.jsx";
import Help from "./pages/Help.jsx";

function RequireAuth({ children }) {
  const { user, needsVerification } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (needsVerification && location.pathname !== "/verify") {
    return <Navigate to="/verify" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout title="Discover">
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/category"
          element={
            <AppLayout title="Category">
              <Dashboard />
            </AppLayout>
          }
        />
        <Route
          path="/book/:id"
          element={
            <AppLayout title="Book Details">
              <BookDetails />
            </AppLayout>
          }
        />
        <Route
          path="/login"
          element={
            <SimpleLayout title="Welcome Back">
              <Login />
            </SimpleLayout>
          }
        />
        <Route
          path="/verify"
          element={
            <RequireAuth>
              <AppLayout title="Verify Register Number">
                <Verify />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/borrowed"
          element={
            <RequireAuth>
              <AppLayout title="Borrowed Books">
                <Borrowed />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/reserved"
          element={
            <RequireAuth>
              <AppLayout title="Reserved Books">
                <Reserved />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/favorites"
          element={
            <RequireAuth>
              <AppLayout title="Favorites">
                <Favorites />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/donate"
          element={
            <RequireAuth>
              <AppLayout title="Donate Books">
                <Donate />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppLayout title="Settings">
                <Settings />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/help"
          element={
            <AppLayout title="Help">
              <Help />
            </AppLayout>
          }
        />
        <Route
          path="/donated"
          element={
            <RequireAuth>
              <AppLayout title="Donated Books">
                <Donations />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/login"
          element={
            <SimpleLayout title="Admin Access">
              <AdminLogin />
            </SimpleLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AppLayout title="Admin Dashboard">
                <AdminDashboard />
              </AppLayout>
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
