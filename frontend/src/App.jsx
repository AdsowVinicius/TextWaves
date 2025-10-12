import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './components/HomePage'
import CriarConta from './components/CriarConta'
import Pagina404 from './components/Pagina404'
import Projeto from './components/Projeto';
import VideoPreview from './components/VideoPreview';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './global.css'


const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Header />
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/CriarConta" element={<CriarConta />} />
          <Route path="/Projeto" element={<Projeto />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/Editor" 
            element={
              <ProtectedRoute>
                <VideoPreview />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirecionar rotas antigas */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<Pagina404 />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App