import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import App from "./app/App.tsx";
import ImageApp from "./image-app/ImageApp.tsx";
import ImageStyleApp from "./image-style/ImageStyleApp.tsx";
import Landing from "./pages/Landing.tsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import "./styles/index.css";

function ProtectedRoute({ element }: { element: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, background: '#07080F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, border: '3px solid rgba(139,92,246,0.2)',
        borderTop: '3px solid #8B5CF6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>加载中…</div>
    </div>
  );
  return user ? element : <Navigate to="/" replace />;
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/video" element={<App />} />
        <Route path="/image" element={<ImageApp />} />
        <Route path="/image-style" element={<ImageStyleApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
