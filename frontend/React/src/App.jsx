// frontend/src/App.jsx
import React, { useState } from 'react';
import './App.css'; 

function App() {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    console.log("Consulta enviada:", input);
    setInput('');
  };

  return (
    <div className="app-wrapper">
      
      {/* 1. BARRA SUPERIOR (NAVBAR) */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo-box"></div>
        </div>
        <div className="nav-right">
          <span className="user-name">Usuario</span>
          <div className="avatar"></div>
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL DIVIDIDO */}
      <div className="main-layout">
        
        {/* 2. SECCIÓN DE CHAT CENTRAL */}
        <main className="chat-section">
          <div className="welcome-container">
            <h1 className="welcome-title">¿Cual es tu reporte?</h1>
            <p className="welcome-subtitle">
              Cuentanos tu situacion y lo atenderemos de inmediato.
            </p>

            {/* CAJA DE TEXTO ESTILO TARJETA (INPUT CARD) */}
            <form onSubmit={handleSubmit} className="input-card">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe tu situación o pregunta lo que necesites..."
                rows="3"
              />
              
              <div className="input-actions-bar">
                <div className="actions-left">
                  {/* Desplegables de configuración/filtros */}
                  <select className="action-select">
                    <option>Evidencia</option>
                  </select>
                  <select className="action-select">
                    <option>Agregar mas detalles</option>
                  </select>
                </div>
                
                <div className="actions-right">
                  {/* Botón de Dictado de voz e Icono de Enviar */}
                  <button type="button" className="icon-btn voice-btn" title="Dictar por voz"></button>
                  <button type="submit" className="submit-btn" title="Enviar reporte"></button>
                </div>
              </div>
            </form>

            <span className="disclaimer-text">
              Gestion de reportes .
            </span>

            <div className="quick-start">
              <span>También puedes ver el avance de tu reporte:</span>
            </div>
          </div>
        </main>

        {/* 3. BARRA LATERAL DERECHA (SIDEBAR) */}
        <aside className="sidebar-right">
          <div className="sidebar-block-top"></div>
          <div className="sidebar-block-bottom"></div>
        </aside>

      </div>
    </div>
  );
}

export default App;
