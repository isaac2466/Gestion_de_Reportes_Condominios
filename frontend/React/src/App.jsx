import React, { useState } from 'react';
import './App.css'; 

const reportesSimulados = [
  {
    id: 1,
    title: "Fuga de agua potable",
    description: "Hay un tubo roto desde la mañana en la esquina y ya inundó toda la acera peatonal.",
    location: "Calle Independencia #405",
    status: "Pendiente",
    imagen: null, // Sin imagen inicial
    ai_analysis: {
      category: "Agua y Drenaje",
      priority: "Alta",
      severity: 4,
      summary: "Se reporta fuga de agua masiva en vía pública afectando el tránsito peatonal.",
      recommendation: "Enviar cuadrilla de fontanería urgente y evaluar cierre de válvula de zona."
    }
  }
];

function App() {
  const [input, setInput] = useState('');
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null); // Estado para la imagen actual
  const [reportes, setReportes] = useState(reportesSimulados);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Manejar la selección del archivo de imagen
  const manejarImagen = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      // Creamos una URL temporal para renderizar la imagen en el frontend
      setImagenSeleccionada(URL.createObjectURL(archivo));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const nuevoReporte = {
      id: reportes.length + 1,
      title: input.substring(0, 30) + (input.length > 30 ? "..." : ""),
      description: input,
      location: "Detectando ubicación...",
      status: "Pendiente",
      imagen: imagenSeleccionada, // Guardamos la URL de la imagen en el reporte
      ai_analysis: {
        category: "Procesando por el sistema...",
        priority: "Evaluando",
        severity: 1,
        summary: "Procesando el texto enviado a través del formulario.",
        recommendation: "Esperando validación inicial de los servidores locales."
      }
    };

    setReportes([nuevoReporte, ...reportes]);
    setInput('');
    setImagenSeleccionada(null); // Reseteamos la imagen para el siguiente reporte
  };

  const verStatus = (reporte) => {
    setReporteSeleccionado(reporte);
    setIsOpen(true);
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
            <h1 className="welcome-title">¿Cuál es tu reporte?</h1>
            <p className="welcome-subtitle">
              Cuéntanos tu situación y lo atenderemos de inmediato.
            </p>

            {/* CAJA DE TEXTO ESTILO TARJETA (INPUT CARD) */}
            <form onSubmit={handleSubmit} className="input-card">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe tu situación o pregunta lo que necesites..."
                rows="3"
              />
              
              {/* Previsualización de la imagen cargada antes de enviar */}
              {imagenSeleccionada && (
                <div className="preview-input-container">
                  <img src={imagenSeleccionada} alt="Preview" className="preview-input-img" />
                  <button type="button" className="btn-remove-preview" onClick={() => setImagenSeleccionada(null)}>✕</button>
                </div>
              )}
              
              <div className="input-actions-bar">
                <div className="actions-left">
                  {/* Convertimos el contenedor en un botón para el input oculto */}
                  <label htmlFor="file-upload" className="action-select custom-file-upload">
                    Adjuntar Evidencia
                  </label>
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={manejarImagen} 
                    style={{ display: 'none' }} 
                  />

                  <select className="action-select">
                    <option>Agregar más detalles</option>
                  </select>
                </div>
                
                <div className="actions-right">
                  <button type="button" className="icon-btn voice-btn" title="Dictar por voz"></button>
                  <button type="submit" className="submit-btn" title="Enviar reporte"></button>
                </div>
              </div>
            </form>

            <span className="disclaimer-text">
              Gestión de reportes inteligente.
            </span>

            <div className="quick-start">
              <span>También puedes ver el avance de tu reporte en la barra lateral derecha.</span>
            </div>
          </div>
        </main>


        {/* 3. BARRA LATERAL DERECHA (SIDEBAR) */}
        <aside className="sidebar-right">
          <div className="sidebar-block-top">
            <h3>Mis Reportes y Estados</h3>
          </div>
          
          <div className="sidebar-block-bottom">
            {reportes.map((rep) => (
              <div 
                key={rep.id} 
                onClick={() => verStatus(rep)}
                className="reporte-item-card"
              >
                <div className="reporte-card-content-layout">
                  {/* Si el reporte tiene imagen, muestra una miniatura en la barra lateral */}
                  {rep.imagen && (
                    <img src={rep.imagen} alt="Miniatura" className="sidebar-report-thumb" />
                  )}
                  <div className="reporte-card-text">
                    <div className="reporte-card-header">
                      <h4>{rep.title}</h4>
                      <span className={`badge-status ${rep.status === "Pendiente" ? "pendiente" : "proceso"}`}>
                        {rep.status}
                      </span>
                    </div>
                    <p className="reporte-card-location">{rep.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

      {/* 4. VENTANA EMERGENTE (MODAL) */}
      {isOpen && reporteSeleccionado && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2>Seguimiento de Reporte #{reporteSeleccionado.id}</h2>
              <button className="modal-close-x" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <h3>{reporteSeleccionado.title}</h3>
              
              {/* Si el reporte guardado contiene imagen, la muestra en tamaño mediano */}
              {reporteSeleccionado.imagen && (
                <div className="modal-image-container">
                  <img src={reporteSeleccionado.imagen} alt="Evidencia adjunta" className="modal-report-img" />
                </div>
              )}

              <p><strong>Descripción:</strong> {reporteSeleccionado.description}</p>
              <p><strong>Ubicación:</strong> {reporteSeleccionado.location}</p>

              <div className="modal-status-highlight">
                Estado del Reporte: <strong>{reporteSeleccionado.status}</strong>
              </div>

              <div className="ai-analysis-box">
                <h4> Análisis del Sistema</h4>
                
                <div className="ai-meta-grid">
                  <div><strong>Categoría:</strong> {reporteSeleccionado.ai_analysis.category}</div>
                  <div><strong>Prioridad:</strong> {reporteSeleccionado.ai_analysis.priority}</div>
                  <div><strong>Gravedad:</strong> {reporteSeleccionado.ai_analysis.severity}/5</div>
                </div>

                <p className="ai-summary">
                  <strong>Resumen:</strong> {reporteSeleccionado.ai_analysis.summary}
                </p>

                <div className="ai-recommendation-alert">
                  <strong>Acción Recomendada:</strong> {reporteSeleccionado.ai_analysis.recommendation}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn-confirm" onClick={() => setIsOpen(false)}>
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
