from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Importaciones de tu base de datos y modelos
from app.config.database import engine, Base, get_db
from app.models.user import Habitante

# Cargar variables de entorno
load_dotenv()

# Esto crea las tablas en la base de datos automáticamente si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("APP_NAME", "Reportes Condominios"),
    version="1.0.0"
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

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

# Configuración de Passlib para generar los hashes de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------- ESQUEMAS DE PYDANTIC (Validan los datos de entrada) ----------------
class RegistroHabitante(BaseModel):
    Nombre: str
    Email: str
    Direccion: str
    Password: str # Aquí recibimos la contraseña en texto normal desde React

class LoginHabitante(BaseModel):
    Email: str
    Password: str

# ---------------- ENDPOINTS DE ESTADO ----------------
@app.get("/")
def home():
    return {
        "message": "API is running"
    }

@app.get("/health")
def health():
    return {
        "status": "ok"
    }

# ---------------- ENDPOINTS DE USUARIOS ----------------
@app.post("/api/registro")
def registrar_habitante(datos: RegistroHabitante, db: Session = Depends(get_db)):
    # 1. Verificamos si el correo ya existe
    habitante_existente = db.query(Habitante).filter(Habitante.Email == datos.Email).first()
    if habitante_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # 2. CREAMOS EL HASH DE LA CONTRASEÑA
    hash_generado = pwd_context.hash(datos.Password)

    # 3. Guardamos en la base de datos con el hash (no la contraseña original)
    nuevo_habitante = Habitante(
        Nombre=datos.Nombre,
        Email=datos.Email,
        Direccion=datos.Direccion,
        Password_hash=hash_generado 
    )
    db.add(nuevo_habitante)
    db.commit()
    db.refresh(nuevo_habitante)

    return {"mensaje": "Habitante registrado exitosamente", "id_habitante": nuevo_habitante.id_habitante}

@app.post("/api/login")
def iniciar_sesion(datos: LoginHabitante, db: Session = Depends(get_db)):
    # 1. Buscamos al habitante por su correo
    habitante = db.query(Habitante).filter(Habitante.Email == datos.Email).first()
    if not habitante:
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    # 2. Verificamos que la contraseña ingresada coincida con el HASH guardado
    if not pwd_context.verify(datos.Password, habitante.Password_hash):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")

    # 3. Si todo está bien, lo dejamos pasar
    return {
        "mensaje": "¡Login exitoso!",
        "habitante": {
            "Nombre": habitante.Nombre,
            "Direccion": habitante.Direccion,
            "Rol": habitante.Rol
        }
    }