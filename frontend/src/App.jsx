import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './components/HomePage'
import CriarConta from './components/CriarConta'
import Pagina404 from './components/Pagina404'
import Projeto from './components/Projeto';
import './global.css'


const App = () => {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="CriarConta" element={<CriarConta />} />
          <Route path="Projeto" element={<Projeto />} />
          <Route path="*" element={<Pagina404 />} />
        </Routes>
        <Footer />
      </BrowserRouter>

    </>
  )
}

export default App