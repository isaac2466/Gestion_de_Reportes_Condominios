from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Aquí ya pusimos tu contraseña "root" y tu base de datos "Colonia"
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:admin@localhost:3306/Colonia"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Esta función la usaremos para darle acceso a la DB a nuestros endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()