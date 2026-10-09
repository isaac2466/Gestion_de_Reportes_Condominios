import React, { useState, useEffect, useRef } from "react";
import "./App.css";

/* ============================================================
   DATOS SIMULADOS
============================================================ */
const reportesSimulados = [
  {
    id: 1,
    mio: true,
    title: "Fuga de agua potable",
    description:
      "Hay un tubo roto desde la mañana en la esquina y ya inundó toda la acera peatonal.",
    location: "Calle Independencia #405",
    status: "Pendiente",
    imagen: null,
    ai_analysis: {
      category: "Agua y Drenaje",
      priority: "Alta",
      severity: 4,
      summary:
        "Se reporta fuga de agua masiva en vía pública afectando el tránsito peatonal.",
      recommendation:
        "Enviar cuadrilla de fontanería urgente y evaluar cierre de válvula de zona.",
    },
  },
  {
    id: 2,
    mio: false,
    title: "Lámpara sin funcionar",
    description: "La lámpara frente al número 120 no enciende desde el lunes.",
    location: "Calle Hidalgo",
    status: "En revisión",
    imagen: null,
    ai_analysis: {
      category: "Alumbrado",
      priority: "Media",
      severity: 2,
      summary: "Luminaria sin funcionar en calle residencial.",
      recommendation: "Programar el cambio de la luminaria.",
    },
  },
  {
    id: 3,
    mio: false,
    title: "Bache en la vialidad",
    description: "Existe un bache que dificulta el tránsito de vehículos.",
    location: "Av. Juárez",
    status: "Atendido",
    imagen: null,
    ai_analysis: {
      category: "Vialidad",
      priority: "Alta",
      severity: 4,
      summary: "Deterioro de la superficie de la vialidad.",
      recommendation: "Realizar reparación de la carpeta asfáltica.",
    },
  },
];

/* ============================================================
   CREAR REPORTE LOCAL
============================================================ */
const crearReporteLocal = (
  reportes,
  { title, description, urgency, archivo }
) => {
  const descSegura = description || "";
  const tituloSeguro =
    title && title.trim()
      ? title.trim()
      : descSegura.substring(0, 25) + (descSegura.length > 25 ? "..." : "");

  return {
    id: Math.max(0, ...reportes.map((r) => r.id)) + 1,
    mio: true,
    title: tituloSeguro,
    description: descSegura,
    location: "Detectando ubicación...",
    status: "Pendiente",
    imagen: archivo ? URL.createObjectURL(archivo) : null,
    ai_analysis: {
      category: "Procesando por el sistema...",
      priority: urgency || "Evaluando",
      severity: 1,
      summary: "Procesando el texto enviado a través del formulario.",
      recommendation: "Esperando validación inicial de los servidores locales.",
    },
  };
};

/* ============================================================
   TARJETA / FILA DE REPORTE
============================================================ */
function TarjetaReporte({ rep, reciente, onVer, administrador }) {
  const getLedClass = (status) => {
    switch (status) {
      case "Atendido":
        return "led-green";
      case "En revisión":
      case "En proceso":
        return "led-blue";
      case "Pendiente":
        return "led-amber";
      default:
        return "led-coral";
    }
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case "Atendido":
        return "badge-atendido";
      case "En revisión":
      case "En proceso":
        return "badge-proceso";
      case "Pendiente":
        return "badge-pendiente";
      default:
        return "badge-cancelado";
    }
  };

  return (
    <div
      onClick={() => onVer(rep)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onVer(rep)}
      role="button"
      tabIndex={0}
      className={`reporte-fila ${reciente ? "reciente-animacion" : ""}`}
    >
      {rep.imagen && (
        <img src={rep.imagen} alt="Evidencia" className="reporte-thumb" />
      )}

      <div className="reporte-info">
        <div className="reporte-header-row">
          <h4 className="reporte-titulo">{rep.title}</h4>
          <span className="folio-mono">#{String(rep.id).padStart(3, "0")}</span>
        </div>

        <div className="badge-wrapper">
          <span className={`badge-status ${getBadgeClass(rep.status)}`}>
            <span className={`status-led ${getLedClass(rep.status)}`}></span>
            {rep.status}
          </span>
        </div>

        <p className="reporte-ubicacion">
          <svg className="svg-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {rep.location}
        </p>

        {administrador && (
          <small className="admin-report-label">Reporte #{rep.id}</small>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APLICACIÓN
============================================================ */
function App() {
  const [titulo, setTitulo] = useState("");
  const [input, setInput] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [urgencia, setUrgencia] = useState("");
  const [error, setError] = useState("");
  const [reportes, setReportes] = useState(reportesSimulados);
  const [recienteId, setRecienteId] = useState(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);

  const [isOpen, setIsOpen] = useState(false);
  const [dictando, setDictando] = useState(false);

  /* MODO DE LA APLICACIÓN */
  const [rol, setRol] = useState("usuario");

  const reconocimiento = useRef(null);

  /* PREVISUALIZACIÓN DE IMAGEN */
  useEffect(() => {
    if (!archivo) {
      setImagenSeleccionada(null);
      return;
    }

    const url = URL.createObjectURL(archivo);
    setImagenSeleccionada(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  /* ESCAPE PARA MODAL */
  useEffect(() => {
    if (!isOpen) return;

    const esc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [isOpen]);

  /* ANIMACIÓN DE REPORTE NUEVO */
  useEffect(() => {
    if (recienteId === null) return;
    const t = setTimeout(() => setRecienteId(null), 4000);
    return () => clearTimeout(t);
  }, [recienteId]);

  /* IMAGEN */
  const manejarImagen = (e) => {
    const f = e.target.files[0];
    if (f) setArchivo(f);
  };

  /* DICTADO POR VOZ */
  const dictarVoz = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      setError(
        "Tu navegador no permite dictar por voz. Prueba con Chrome o Edge."
      );
      return;
    }

    if (dictando) {
      reconocimiento.current?.stop();
      return;
    }

    const r = new SR();
    r.lang = "es-MX";

    r.onresult = (e) => {
      setInput(
        (prev) => (prev ? prev + " " : "") + e.results[0][0].transcript
      );
    };

    r.onend = () => setDictando(false);
    r.onerror = () => setDictando(false);

    reconocimiento.current = r;
    r.start();
    setDictando(true);
  };

  /* ENVIAR REPORTE */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!titulo.trim()) {
      setError("Por favor, introduce un título para la incidencia.");
      return;
    }

    if (!input.trim()) {
      setError("Escribe una descripción para poder enviar tu reporte.");
      return;
    }

    setError("");

    try {
      const nuevo = crearReporteLocal(reportes, {
        title: titulo,
        description: input,
        urgency: urgencia,
        archivo: archivo,
      });

      setReportes((prev) => [nuevo, ...prev]);
      setRecienteId(nuevo.id);

      setTitulo("");
      setInput("");
      setUrgencia("");
      setArchivo(null);
    } catch (err) {
      console.error("Fallo crítico:", err);
      setError("Ocurrió un error inesperado al procesar el formulario.");
    }
  };

  /* ABRIR REPORTE */
  const verStatus = (reporte) => {
    setReporteSeleccionado(reporte);
    setIsOpen(true);
  };

  /* CAMBIAR ESTADO - ADMINISTRADOR */
  const cambiarEstado = (nuevoEstado) => {
    if (!reporteSeleccionado) return;

    const actualizado = {
      ...reporteSeleccionado,
      status: nuevoEstado,
    };

    setReportes((prev) =>
      prev.map((reporte) =>
        reporte.id === actualizado.id ? actualizado : reporte
      )
    );

    setReporteSeleccionado(actualizado);
  };

  /* REPORTES DEL USUARIO */
  const misReportes = reportes.filter((reporte) => reporte.mio);

  const cancelarReporteUsuario = (id) => {
    setReportes((prevReportes) =>
      prevReportes.map((rep) =>
        rep.id === id ? { ...rep, status: "Cancelado por usuario" } : rep
      )
    );
    setIsOpen(false);
    setReporteSeleccionado(null);
  };

  /* REPORTES DEL ADMINISTRADOR */
  const pendientes = reportes.filter((r) => r.status === "Pendiente");
  const enRevision = reportes.filter((r) => r.status === "En revisión");
  const enProceso = reportes.filter((r) => r.status === "En proceso");
  const atendidos = reportes.filter((r) => r.status === "Atendido");

  return (
    <div className="app-wrapper">
      {/* ======================================================
          BARRA SUPERIOR (NAVBAR)
      ====================================================== */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-dot"></span>
          <span className="brand-name">Reporta+</span>
        </div>

        <div className="nav-controls">
          <div className="role-switch">
            <button
              type="button"
              className={`role-btn ${rol === "usuario" ? "active" : ""}`}
              onClick={() => setRol("usuario")}
            >
              Vista usuario
            </button>
            <button
              type="button"
              className={`role-btn ${rol === "administrador" ? "active" : ""}`}
              onClick={() => setRol("administrador")}
            >
              Vista administrador
            </button>
          </div>

          <span className="role-label">
            {rol === "usuario" ? "Ciudadano" : "Administrador"}
          </span>

          <div className="avatar">A</div>
        </div>
      </nav>

      {/* ======================================================
          VISTA USUARIO (RESTRICCIÓN DE ANCHO Y REJILLA)
      ====================================================== */}
      {rol === "usuario" && (
        <div className="content-container">
          <div className="layout-grid">
            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <main className="form-column">
              <div className="section-title-box">
                <span className="kicker-badge">ATENCIÓN Y SERVICIOS</span>
                <h1 className="main-heading">¿Cuál es tu reporte?</h1>
                <p className="main-subheading">
                  Cuéntanos tu situación y el equipo la atenderá de inmediato.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="form-card">
                <div className="input-group">
                  <label htmlFor="report-title-input" className="field-label">
                    Título del reporte
                  </label>
                  <input
                    id="report-title-input"
                    type="text"
                    className="text-input"
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Ej. Fuga de agua, Bache en vía pública..."
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="report-desc-textarea" className="field-label">
                    Descripción detallada
                  </label>
                  <textarea
                    id="report-desc-textarea"
                    className="textarea-input"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Escribe aquí los detalles del problema, referencias o más datos..."
                    rows="4"
                    aria-label="Describe tu situación"
                    aria-invalid={!!error}
                  />
                </div>

                {error && <p className="error-banner">⚠️ {error}</p>}

                {imagenSeleccionada && (
                  <div className="preview-container">
                    <img
                      src={imagenSeleccionada}
                      alt="Preview"
                      className="preview-img"
                    />
                    <button
                      type="button"
                      className="remove-preview-btn"
                      aria-label="Quitar imagen"
                      onClick={() => setArchivo(null)}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* BARRA DE ACCIONES INFERIOR CON SVGs VECTORIALES */}
                <div className="form-actions-bar">
                  <div className="left-actions">
                    <label htmlFor="file-upload" className="btn-secondary">
                      <svg
                        className="btn-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      Adjuntar evidencia
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={manejarImagen}
                      className="hidden-file-input"
                    />

                    <button
                      type="button"
                      className={`btn-icon ${dictando ? "mic-active" : ""}`}
                      onClick={dictarVoz}
                      title="Dictar voz"
                    >
                      <svg
                        className="btn-svg-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    </button>
                  </div>

                  <button type="submit" className="btn-primary">
                    Enviar reporte
                    <svg
                      className="btn-svg-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </form>

              <span className="footer-disclaimer">
                Gestión de reportes inteligente.
              </span>
            </main>

            {/* COLUMNA DERECHA: HISTORIAL "MIS REPORTES" */}
            <aside className="history-column">
              <div className="history-header">
                <h3>Mis reportes</h3>
                <span>Consulta el estado de tus solicitudes</span>
              </div>

              <div className="history-list">
                {misReportes.length === 0 ? (
                  <p className="empty-history-text">
                    Aún no has enviado reportes.
                  </p>
                ) : (
                  misReportes.map((reporte) => (
                    <TarjetaReporte
                      key={reporte.id}
                      rep={reporte}
                      reciente={reporte.id === recienteId}
                      onVer={verStatus}
                    />
                  ))
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ======================================================
          VISTA ADMINISTRADOR
      ====================================================== */}
      {rol === "administrador" && (
        <main className="content-container">
          <div className="section-title-box">
            <span className="kicker-badge">PANEL DE CONTROL</span>
            <h1 className="main-heading">Gestión de reportes</h1>
            <p className="main-subheading">
              Supervisa y administra los reportes de la comunidad.
            </p>
          </div>

          <div className="kpis-grid">
            <div className="kpi-card">
              <span>Total</span>
              <strong>{reportes.length}</strong>
            </div>
            <div className="kpi-card">
              <span>Pendientes</span>
              <strong className="text-amber">{pendientes.length}</strong>
            </div>
            <div className="kpi-card">
              <span>En revisión</span>
              <strong className="text-blue">{enRevision.length}</strong>
            </div>
            <div className="kpi-card">
              <span>En proceso</span>
              <strong className="text-indigo">{enProceso.length}</strong>
            </div>
            <div className="kpi-card">
              <span>Atendidos</span>
              <strong className="text-green">{atendidos.length}</strong>
            </div>
          </div>

          <div className="admin-grid">
            <section className="admin-list-card">
              <div className="admin-card-header">
                <h3>Reportes de la comunidad</h3>
                <span>Selecciona para ver el detalle.</span>
              </div>

              <div className="admin-scroll-container">
                {reportes.map((reporte) => (
                  <TarjetaReporte
                    key={reporte.id}
                    rep={reporte}
                    reciente={false}
                    onVer={verStatus}
                    administrador
                  />
                ))}
              </div>
            </section>

            <section className="admin-detail-card">
              {!reporteSeleccionado ? (
                <div className="empty-detail">
                  <svg className="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <h3>Selecciona un reporte</h3>
                  <p>Consulta evidencia y análisis del sistema.</p>
                </div>
              ) : (
                <>
                  <div className="detail-header">
                    <div>
                      <span className="folio-mono">
                        Reporte #{reporteSeleccionado.id}
                      </span>
                      <h2>{reporteSeleccionado.title}</h2>
                    </div>

                    <span className="badge-admin">
                      {reporteSeleccionado.status}
                    </span>
                  </div>

                  {reporteSeleccionado.imagen && (
                    <div className="detail-img-box">
                      <img
                        src={reporteSeleccionado.imagen}
                        alt="Evidencia"
                      />
                    </div>
                  )}

                  <div className="detail-info">
                    <p>
                      <strong>Descripción:</strong>{" "}
                      {reporteSeleccionado.description}
                    </p>
                    <p>
                      <strong>Ubicación:</strong> {reporteSeleccionado.location}
                    </p>
                  </div>

                  <div className="ai-box">
                    <h4>Análisis del sistema</h4>

                    <div className="ai-meta">
                      <div>
                        <strong>Categoría:</strong>{" "}
                        {reporteSeleccionado.ai_analysis.category}
                      </div>
                      <div>
                        <strong>Prioridad:</strong>{" "}
                        {reporteSeleccionado.ai_analysis.priority}
                      </div>
                      <div>
                        <strong>Gravedad:</strong>{" "}
                        {reporteSeleccionado.ai_analysis.severity}/5
                      </div>
                    </div>

                    <p>
                      <strong>Resumen:</strong>{" "}
                      {reporteSeleccionado.ai_analysis.summary}
                    </p>

                    <div className="ai-rec">
                      <strong>Acción recomendada:</strong>{" "}
                      {reporteSeleccionado.ai_analysis.recommendation}
                    </div>
                  </div>

                  <div className="status-control-box">
                    <h4>Actualizar estado</h4>
                    <div className="status-btn-group">
                      <button onClick={() => cambiarEstado("Pendiente")}>
                        Pendiente
                      </button>
                      <button onClick={() => cambiarEstado("En revisión")}>
                        En revisión
                      </button>
                      <button onClick={() => cambiarEstado("En proceso")}>
                        En proceso
                      </button>
                      <button onClick={() => cambiarEstado("Atendido")}>
                        Atendido
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ======================================================
          MODAL DE DETALLE
      ====================================================== */}
      {isOpen && reporteSeleccionado && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Seguimiento de Reporte #{reporteSeleccionado.id}</h2>
              <button className="close-x" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <h3>{reporteSeleccionado.title}</h3>

              {reporteSeleccionado.imagen && (
                <div className="modal-img-wrapper">
                  <img
                    src={reporteSeleccionado.imagen}
                    alt="Evidencia adjunta"
                  />
                </div>
              )}

              <p>
                <strong>Descripción:</strong> {reporteSeleccionado.description}
              </p>
              <p>
                <strong>Ubicación:</strong> {reporteSeleccionado.location}
              </p>

              <div className="modal-status-highlight">
                Estado del Reporte:{" "}
                <strong>{reporteSeleccionado.status}</strong>
              </div>

              <div className="ai-box">
                <h4>Análisis del Sistema</h4>
                <div className="ai-meta">
                  <div>
                    <strong>Categoría:</strong>{" "}
                    {reporteSeleccionado.ai_analysis.category}
                  </div>
                  <div>
                    <strong>Prioridad:</strong>{" "}
                    {reporteSeleccionado.ai_analysis.priority}
                  </div>
                  <div>
                    <strong>Gravedad:</strong>{" "}
                    {reporteSeleccionado.ai_analysis.severity}/5
                  </div>
                </div>
                <p>
                  <strong>Resumen:</strong>{" "}
                  {reporteSeleccionado.ai_analysis.summary}
                </p>
                <div className="ai-rec">
                  <strong>Acción Recomendada:</strong>{" "}
                  {reporteSeleccionado.ai_analysis.recommendation}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              {rol === "usuario" &&
                reporteSeleccionado.mio &&
                reporteSeleccionado.status !== "Cancelado por usuario" && (
                  <button
                    type="button"
                    className="btn-cancel-report"
                    onClick={() =>
                      cancelarReporteUsuario(reporteSeleccionado.id)
                    }
                  >
                    Cancelar reporte (Ya lo solucioné)
                  </button>
                )}

              {rol === "usuario" &&
                reporteSeleccionado.status === "Cancelado por usuario" && (
                  <span className="cancel-label">Cancelado por ti</span>
                )}

              <button
                type="button"
                className="btn-confirm"
                onClick={() => setIsOpen(false)}
              >
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