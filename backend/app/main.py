import uuid
import os
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from dotenv import load_dotenv

# Importaciones de base de datos, modelos y servicio de IA
from app.config.database import engine, Base, get_db
from app.models.user import Habitante
from app.models.report import Reporte, PrioridadEnum, EstadoEnum, ImagenReporte


# Cargar variables de entorno
load_dotenv()

# Crear tablas en la base de datos automáticamente si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("APP_NAME", "Colonia Reportes API"),
    version="1.0.0"
)

# ---------------- CONFIGURACIÓN DE CARPETA DE IMÁGENES ----------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------- ESQUEMAS PYDANTIC ----------------
class RegistroHabitante(BaseModel):
    Nombre: str
    Email: str
    Direccion: str
    Password: str

class LoginHabitante(BaseModel):
    Email: str
    Password: str

class ActualizarEstadoReporte(BaseModel):
    estado: EstadoEnum
    prioridad: PrioridadEnum | None = None

# ---------------- ENDPOINTS DE ESTADO ----------------
@app.get("/")
def home():
    return {"message": "API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------- ENDPOINTS DE USUARIOS ----------------
@app.post("/api/registro")
def registrar_habitante(datos: RegistroHabitante, db: Session = Depends(get_db)):
    habitante_existente = db.query(Habitante).filter(Habitante.Email == datos.Email).first()
    if habitante_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    hash_generado = pwd_context.hash(datos.Password)

    nuevo_habitante = Habitante(
        Nombre=datos.Nombre,
        Email=datos.Email,
        Direccion=datos.Direccion,
        Password_hash=hash_generado
    )
    db.add(nuevo_habitante)
    db.commit()
    db.refresh(nuevo_habitante)

    return {
        "mensaje": "Habitante registrado exitosamente",
        "id_habitante": nuevo_habitante.id_habitante
    }

@app.post("/api/login")
def iniciar_sesion(datos: LoginHabitante, db: Session = Depends(get_db)):
    habitante = db.query(Habitante).filter(Habitante.Email == datos.Email).first()
    if not habitante:
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    if not pwd_context.verify(datos.Password, habitante.Password_hash):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    return {
        "mensaje": "¡Login exitoso!",
        "habitante": {
            "id_habitante": habitante.id_habitante,
            "Nombre": habitante.Nombre,
            "Direccion": habitante.Direccion,
            "Rol": habitante.Rol
        }
    }

# ---------------- ENDPOINTS DE REPORTES CON IMÁGENES ----------------

# 1. CREAR REPORTE (Con imágenes adjuntas)
@app.post("/api/reportes")
async def crear_reporte(
    id_habitante: int = Form(...),
    titulo: str = Form(...),
    descripcion: str = Form(...),
    locacion: str = Form(None),
    archivos: list[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Validar existencia del habitante
    habitante = db.query(Habitante).filter(Habitante.id_habitante == id_habitante).first()
    if not habitante:
        raise HTTPException(status_code=404, detail="El habitante especificado no existe")

    # Analizar con IA (Ollama)
    analisis_ia = await analizar_reporte_con_ia(
        descripcion=descripcion,
        direccion_habitante=habitante.Direccion
    )

    # Guardar reporte en MySQL
    nuevo_reporte = Reporte(
        id_habitante=id_habitante,
        titulo=titulo,
        descripcion=descripcion,
        locacion=locacion or habitante.Direccion,
        categoria=analisis_ia.get("categoria"),
        prioridad=analisis_ia.get("prioridad", "Medium"),
        severidad=analisis_ia.get("severidad", 1),
        resumen_ia=analisis_ia.get("resumen_ia"),
        recomendacion_ia=analisis_ia.get("recomendacion_ia"),
        confianza_ia=analisis_ia.get("confianza_ia", 0.0),
        estado="Pendiente"
    )

    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)

    # Guardar imágenes si fueron enviadas
    rutas_imagenes = []
    if archivos:
        for archivo in archivos:
            if archivo.filename:
                # Nombre único para evitar duplicados
                extension = archivo.filename.split(".")[-1]
                nombre_unico = f"{uuid.uuid4()}.{extension}"
                ruta_disco = os.path.join(UPLOAD_DIR, nombre_unico)

                # Guardar archivo físicamente en la carpeta uploads/
                with open(ruta_disco, "wb") as f:
                    contenido = await archivo.read()
                    f.write(contenido)

                url_publica = f"/uploads/{nombre_unico}"
                nueva_imagen = ImagenReporte(
                    id_reporte=nuevo_reporte.id,
                    url_imagen=url_publica
                )
                db.add(nueva_imagen)
                rutas_imagenes.append(url_publica)

        db.commit()

    return {
        "mensaje": "Reporte e imágenes creados exitosamente",
        "reporte": nuevo_reporte,
        "imagenes": rutas_imagenes
    }

# 2. LISTAR REPORTES (Incluyendo sus imágenes)
@app.get("/api/reportes")
def listar_reportes(db: Session = Depends(get_db)):
    reportes = db.query(Reporte).all()
    resultado = []
    for r in reportes:
        imgs = db.query(ImagenReporte).filter(ImagenReporte.id_reporte == r.id).all()
        resultado.append({
            "reporte": r,
            "imagenes": [img.url_imagen for img in imgs]
        })
    return resultado

# 3. OBTENER UN REPORTE POR ID
@app.get("/api/reportes/{id_reporte}")
def obtener_reporte(id_reporte: int, db: Session = Depends(get_db)):
    reporte = db.query(Reporte).filter(Reporte.id == id_reporte).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    imgs = db.query(ImagenReporte).filter(ImagenReporte.id_reporte == id_reporte).all()
    return {
        "reporte": reporte,
        "imagenes": [img.url_imagen for img in imgs]
    }

# 4. ACTUALIZAR ESTADO DEL REPORTE
@app.put("/api/reportes/{id_reporte}")
def actualizar_reporte(id_reporte: int, datos: ActualizarEstadoReporte, db: Session = Depends(get_db)):
    reporte = db.query(Reporte).filter(Reporte.id == id_reporte).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    reporte.estado = datos.estado
    if datos.prioridad:
        reporte.prioridad = datos.prioridad

    db.commit()
    db.refresh(reporte)

    return {"mensaje": "Reporte actualizado", "reporte": reporte}

# 5. ELIMINAR REPORTE
@app.delete("/api/reportes/{id_reporte}")
def eliminar_reporte(id_reporte: int, db: Session = Depends(get_db)):
    reporte = db.query(Reporte).filter(Reporte.id == id_reporte).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    db.delete(reporte)
    db.commit()

    return {"mensaje": f"Reporte #{id_reporte} eliminado exitosamente"}