import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TesterDashboard from "./pages/TesterDashboard";
import CSSEditorDashboard from "./pages/CSSEditorDashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { MusicProvider } from "./context/MusicContext";
import MiniPlayer from "./components/MiniPlayer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./pages/student/navbar/Navbar";
import SearchResults from "./pages/student/navbar/SearchResults.jsx";
import { useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/" || location.pathname === "/login";

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchResults />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tester/*"
          element={
            <ProtectedRoute requiredRole="tester">
              <TesterDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/css-editor/*"
          element={
            <ProtectedRoute requiredRole="css_editor">
              <CSSEditorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/*"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>

      <MiniPlayer />
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <NotificationProvider>
          <MusicProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
            </Router>
          </MusicProvider>
        </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}


export default App;
