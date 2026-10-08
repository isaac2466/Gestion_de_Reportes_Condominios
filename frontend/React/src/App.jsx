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
    description:
      "La lámpara frente al número 120 no enciende desde el lunes.",
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
    description:
      "Existe un bache que dificulta el tránsito de vehículos.",
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
  // Aseguramos que 'description' exista como string para evitar que .substring() rompa el código
  const descSegura = description || ""; 
  
  // Si por alguna razón 'title' viene vacío, usamos los primeros caracteres de la descripción
  const tituloSeguro = (title && title.trim()) 
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
   TARJETA DE REPORTE
============================================================ */

function TarjetaReporte({ rep, reciente, onVer, administrador }) {
  return (
    <div
      onClick={() => onVer(rep)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onVer(rep)
      }
      role="button"
      tabIndex={0}
      className={`reporte-item-card${
        reciente ? " reciente-animacion" : ""
      }`}
    >
      <div className="reporte-card-content-layout">
        {rep.imagen && (
          <img
            src={rep.imagen}
            alt="Evidencia"
            className="sidebar-report-thumb"
          />
        )}

        <div className="reporte-card-text">
          <div className="reporte-card-header">
            <h4>{rep.title}</h4>

            <span
              className={`badge-status status-${rep.status
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              {rep.status}
            </span>
          </div>

          <p className="reporte-card-location">
            {rep.location}
          </p>

          {administrador && (
            <small className="admin-report-label">
              Reporte #{rep.id}
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APLICACIÓN
============================================================ */

function App() {
  const [titulo, setTitulo] = useState(""); // <-- Revisa que esta línea exista obligatoriamente
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

  /* MODO DE LA APLICACIÓN
     En producción vendrá desde el login/backend.
  */
  const [rol, setRol] = useState("usuario");

  const reconocimiento = useRef(null);

  /* ==========================================================
     PREVISUALIZACIÓN DE IMAGEN
  ========================================================== */

  useEffect(() => {
    if (!archivo) {
      setImagenSeleccionada(null);
      return;
    }

    const url = URL.createObjectURL(archivo);
    setImagenSeleccionada(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  /* ==========================================================
     ESCAPE PARA MODAL
  ========================================================== */

  useEffect(() => {
    if (!isOpen) return;

    const esc = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", esc);

    return () =>
      window.removeEventListener("keydown", esc);
  }, [isOpen]);

  /* ==========================================================
     ANIMACIÓN DE REPORTE NUEVO
  ========================================================== */

  useEffect(() => {
    if (recienteId === null) return;

    const t = setTimeout(
      () => setRecienteId(null),
      4000
    );

    return () => clearTimeout(t);
  }, [recienteId]);

  /* ==========================================================
     IMAGEN
  ========================================================== */

  const manejarImagen = (e) => {
    const f = e.target.files[0];

    if (f) {
      setArchivo(f);
    }
  };

  /* ==========================================================
     DICTADO POR VOZ
  ========================================================== */

  const dictarVoz = () => {
    const SR =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

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
        (prev) =>
          (prev ? prev + " " : "") +
          e.results[0][0].transcript
      );
    };

    r.onend = () => setDictando(false);
    r.onerror = () => setDictando(false);

    reconocimiento.current = r;

    r.start();
    setDictando(true);
  };

  /* ==========================================================
     ENVIAR REPORTE
  ========================================================== */
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
        title: titulo,       // <--- Enviamos la variable 'titulo' de tu nuevo input
        description: input,  // <--- Enviamos el texto del textarea
        urgency: urgencia,
        archivo: archivo,
      });

      setReportes((prev) => [nuevo, ...prev]);
      setRecienteId(nuevo.id);

      // Limpiamos los estados del formulario tras un envío exitoso
      setTitulo("");
      setInput("");
      setUrgencia("");
      setArchivo(null);

    } catch (err) {
      console.error("Fallo crítico:", err);
      setError("Ocurrió un error inesperado al procesar el formulario.");
    }
  };



  /* ==========================================================
     ABRIR REPORTE
  ========================================================== */

  const verStatus = (reporte) => {
    setReporteSeleccionado(reporte);
    setIsOpen(true);
  };

  /* ==========================================================
     CAMBIAR ESTADO - ADMINISTRADOR
  ========================================================== */

  const cambiarEstado = (nuevoEstado) => {
    if (!reporteSeleccionado) return;

    const actualizado = {
      ...reporteSeleccionado,
      status: nuevoEstado,
    };

    setReportes((prev) =>
      prev.map((reporte) =>
        reporte.id === actualizado.id
          ? actualizado
          : reporte
      )
    );

    setReporteSeleccionado(actualizado);
  };


  /* ==========================================================
     REPORTES DEL USUARIO
  ========================================================== */

  const misReportes = reportes.filter(
    (reporte) => reporte.mio
  );
const cancelarReporteUsuario = (id) => {
  setReportes((prevReportes) =>
    prevReportes.map((rep) =>
      rep.id === id ? { ...rep, status: "Cancelado por usuario" } : rep
    )
  );
  setIsOpen(false);
  setReporteSeleccionado(null);
};


  /* ==========================================================
     REPORTES DEL ADMINISTRADOR
  ========================================================== */

  const pendientes = reportes.filter(
    (r) => r.status === "Pendiente"
  );

  const enRevision = reportes.filter(
    (r) => r.status === "En revisión"
  );

  const enProceso = reportes.filter(
    (r) => r.status === "En proceso"
  );

  const atendidos = reportes.filter(
    (r) => r.status === "Atendido"
  );

  return (
    <div className="app-wrapper">

      {/* ======================================================
          BARRA SUPERIOR
      ====================================================== */}

      <nav className="navbar">

        <div className="nav-left">
          <div className="logo-box"></div>
        </div>

        <div className="nav-right">

          <button
            className="role-switch"
            onClick={() =>
              setRol(
                rol === "usuario"
                  ? "administrador"
                  : "usuario"
              )
            }
          >
            {rol === "usuario"
              ? "Vista usuario"
              : "Vista administrador"}
          </button>

          <span className="user-name">
            {rol === "usuario"
              ? "Usuario"
              : "Administrador"}
          </span>

          <div className="avatar"></div>

        </div>

      </nav>

      {/* ======================================================
          VISTA USUARIO
      ====================================================== */}

          {rol === "usuario" && (
        <div className="main-layout">

          <main className="chat-section">

            <div className="welcome-container">

              <h1 className="welcome-title">
                ¿Cuál es tu reporte?
              </h1>

              <p className="welcome-subtitle">
                Cuéntanos tu situación y lo atenderemos
                de inmediato.
              </p>

              <form
                onSubmit={handleSubmit}
                className="input-card"
                style={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >

                {/* 1. NUEVO INPUT DE TEXTO PARA EL TÍTULO DE LA PROBLEMÁTICA */}
                <input
  type="text"
  className="titulo-input-field" // <-- Le asignamos esta clase limpia
  value={titulo}
  onChange={(e) => {
    setTitulo(e.target.value);
    if (error) setError("");
  }}
  placeholder="Título de la problemática (Ej. Fuga de agua, Bache...)"
/>

               

                {/* 2. TU TEXTAREA DE DESCRIPCIÓN ORIGINAL (QUEDA ABAJO DEL TÍTULO) */}
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Describe tu situación con más detalle..."
                  rows="3"
                  aria-label="Describe tu situación"
                  aria-invalid={!!error}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />

                {error && (
                  <p
                    className="field-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                {imagenSeleccionada && (
                  <div className="preview-input-container">

                    <img
                      src={imagenSeleccionada}
                      alt="Preview"
                      className="preview-input-img"
                    />

                    <button
                      type="button"
                      className="btn-remove-preview"
                      aria-label="Quitar imagen"
                      onClick={() =>
                        setArchivo(null)
                      }
                    >
                      
                    </button>

                  </div>
                )}

                <div className="input-actions-bar">

                  <div className="actions-left">

                    <label
                      htmlFor="file-upload"
                      className="action-select custom-file-upload"
                    >
                      Adjuntar evidencia
                    </label>

                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={manejarImagen}
                      style={{
                        display: "none",
                      }}
                    />

                    {/* SE ELIMINÓ EL SELECTOR ANTERIOR DE "AGREGAR DETALLES" */}

                  </div>

                  <div className="actions-right">

                    <button
                      type="button"
                      className={`icon-btn voice-btn${
                        dictando
                          ? " escuchando"
                          : ""
                      }`}
                      onClick={dictarVoz}
                    >
                      🎙️
                    </button>

                    <button
                      type="submit"
                      className="submit-btn"
                    >
                      →
                    </button>

                  </div>

                </div>

              </form>

              <span className="disclaimer-text">
                Gestión de reportes inteligente.
              </span>

            </div>

          </main>


          {/* ==================================================
              MIS REPORTES
          ================================================== */}

          <aside className="sidebar-right">

            <section className="sidebar-section">

              <div className="sidebar-section-head">

                <h3>Mis reportes</h3>

                <span>
                  Consulta el estado de tus reportes
                </span>

              </div>

              <div className="scroll-historial">

                {misReportes.length === 0 ? (

                  <p className="sidebar-empty-text">
                    Aún no has enviado reportes.
                  </p>

                ) : (

                  misReportes.map((reporte) => (
                    <TarjetaReporte
                      key={reporte.id}
                      rep={reporte}
                      reciente={
                        reporte.id === recienteId
                      }
                      onVer={verStatus}
                    />
                  ))

                )}

              </div>

            </section>

          </aside>

        </div>
      )}

      {/* ======================================================
          VISTA ADMINISTRADOR
      ====================================================== */}

      {rol === "administrador" && (

        <main className="admin-dashboard">

          <div className="admin-header">

            <div>
              <h1>
                Gestión de reportes
              </h1>

              <p>
                Supervisa y administra los reportes
                de la comunidad.
              </p>
            </div>

          </div>

          {/* KPIs */}

          <div className="admin-kpis">

            <div className="admin-kpi">
              <span>Total</span>
              <strong>{reportes.length}</strong>
            </div>

            <div className="admin-kpi">
              <span>Pendientes</span>
              <strong>{pendientes.length}</strong>
            </div>

            <div className="admin-kpi">
              <span>En revisión</span>
              <strong>{enRevision.length}</strong>
            </div>

            <div className="admin-kpi">
              <span>En proceso</span>
              <strong>{enProceso.length}</strong>
            </div>

            <div className="admin-kpi">
              <span>Atendidos</span>
              <strong>{atendidos.length}</strong>
            </div>

          </div>

          {/* REPORTES */}

          <div className="admin-content">

            <section className="admin-report-list">

              <div className="sidebar-section-head">

                <h3>
                  Reportes de la comunidad
                </h3>

                <span>
                  Selecciona un reporte para
                  consultar sus detalles.
                </span>

              </div>

              <div className="admin-scroll">

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

            {/* DETALLE DEL ADMINISTRADOR */}

            <section className="admin-detail">

              {!reporteSeleccionado ? (

                <div className="admin-empty">

                  <span></span>

                  <h3>
                    Selecciona un reporte
                  </h3>

                  <p>
                    Aquí podrás consultar la
                    evidencia, análisis y estado.
                  </p>

                </div>

              ) : (

                <>

                  <div className="admin-detail-header">

                    <div>

                      <span>
                        Reporte #{reporteSeleccionado.id}
                      </span>

                      <h2>
                        {reporteSeleccionado.title}
                      </h2>

                    </div>

                    <span
                      className={`badge-status status-${reporteSeleccionado.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {reporteSeleccionado.status}
                    </span>

                  </div>

                  {reporteSeleccionado.imagen && (

                    <div className="admin-image-container">

                      <img
                        src={
                          reporteSeleccionado.imagen
                        }
                        alt="Evidencia"
                      />

                    </div>

                  )}

                  <div className="admin-info">

                    <p>
                      <strong>
                        Descripción:
                      </strong>{" "}
                      {reporteSeleccionado.description}
                    </p>

                    <p>
                      <strong>
                        Ubicación:
                      </strong>{" "}
                      {reporteSeleccionado.location}
                    </p>

                  </div>

                  {/* IA */}

                  <div className="ai-analysis-box">

                    <h4>
                      Análisis del sistema
                    </h4>

                    <div className="ai-meta-grid">

                      <div>
                        <strong>
                          Categoría:
                        </strong>{" "}
                        {
                          reporteSeleccionado
                            .ai_analysis.category
                        }
                      </div>

                      <div>
                        <strong>
                          Prioridad:
                        </strong>{" "}
                        {
                          reporteSeleccionado
                            .ai_analysis.priority
                        }
                      </div>

                      <div>
                        <strong>
                          Gravedad:
                        </strong>{" "}
                        {
                          reporteSeleccionado
                            .ai_analysis.severity
                        }
                        /5
                      </div>

                    </div>

                    <p className="ai-summary">

                      <strong>
                        Resumen:
                      </strong>{" "}

                      {
                        reporteSeleccionado
                          .ai_analysis.summary
                      }

                    </p>

                    <div className="ai-recommendation-alert">

                      <strong>
                        Acción recomendada:
                      </strong>{" "}

                      {
                        reporteSeleccionado
                          .ai_analysis.recommendation
                      }

                    </div>

                  </div>

                  {/* CAMBIO DE ESTADO */}

                  <div className="admin-status-control">

                    <h4>
                      Actualizar estado
                    </h4>

                    <div className="status-buttons">

                      <button
                        onClick={() =>
                          cambiarEstado("Pendiente")
                        }
                      >
                        Pendiente
                      </button>

                      <button
                        onClick={() =>
                          cambiarEstado("En revisión")
                        }
                      >
                        En revisión
                      </button>

                      <button
                        onClick={() =>
                          cambiarEstado("En proceso")
                        }
                      >
                        En proceso
                      </button>

                      <button
                        onClick={() =>
                          cambiarEstado("Atendido")
                        }
                      >
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

        <div
          className="modal-overlay"
          onClick={() => setIsOpen(false)}
        >

          <div
            className="modal-container"
            role="dialog"
            aria-modal="true"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <h2>
                Seguimiento de Reporte #
                {reporteSeleccionado.id}
              </h2>

              <button
                className="modal-close-x"
                onClick={() =>
                  setIsOpen(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="modal-body">

                           <h3>
                {reporteSeleccionado.title}
              </h3>

              {reporteSeleccionado.imagen && (
                <div className="modal-image-container">
                  <img
                    src={reporteSeleccionado.imagen}
                    alt="Evidencia adjunta"
                    className="modal-report-img"
                  />
                </div>
              )}

              <p>
                <strong>
                  Descripción:
                </strong>{" "}
                {reporteSeleccionado.description}
              </p>

              <p>
                <strong>
                  Ubicación:
                </strong>{" "}
                {reporteSeleccionado.location}
              </p>

              <div className="modal-status-highlight">
                Estado del Reporte:{" "}
                <strong>
                  {reporteSeleccionado.status}
                </strong>
              </div>

              <div className="ai-analysis-box">
                <h4>
                  Análisis del Sistema
                </h4>

                <div className="ai-meta-grid">
                  <div>
                    <strong>
                      Categoría:
                    </strong>{" "}
                    {
                      reporteSeleccionado
                        .ai_analysis.category
                    }
                  </div>

                  <div>
                    <strong>
                      Prioridad:
                    </strong>{" "}
                    {
                      reporteSeleccionado
                        .ai_analysis.priority
                    }
                  </div>

                  <div>
                    <strong>
                      Gravedad:
                    </strong>{" "}
                    {
                      reporteSeleccionado
                        .ai_analysis.severity
                    }
                    /5
                  </div>
                </div>

                <p className="ai-summary">
                  <strong>
                    Resumen:
                  </strong>{" "}
                  {
                    reporteSeleccionado
                      .ai_analysis.summary
                  }
                </p>

                <div className="ai-recommendation-alert">
                  <strong>
                    Acción Recomendada:
                  </strong>{" "}
                  {
                    reporteSeleccionado
                      .ai_analysis.recommendation
                  }
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              
              {/* ACCIÓN SOLICITADA: Cancelación del reporte por su cuenta si le pertenece y sigue activo */}
              {rol === "usuario" && reporteSeleccionado.mio && reporteSeleccionado.status !== "Cancelado por usuario" && (
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => cancelarReporteUsuario(reporteSeleccionado.id)}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Cancelar reporte (Ya lo solucioné)
                </button>
              )}

              {/* Muestra un indicador visual si ya fue cancelado previamente por el usuario */}
              {rol === "usuario" && reporteSeleccionado.status === "Cancelado por usuario" && (
                <span style={{ color: "#dc3545", fontWeight: "bold", alignSelf: "center", fontSize: "14px" }}>
                  Cancelado por ti
                </span>
              )}

              {/* Botón de cierre original de tu código */}
              <button
                className="modal-btn-confirm"
                onClick={() =>
                  setIsOpen(false)
                }
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
