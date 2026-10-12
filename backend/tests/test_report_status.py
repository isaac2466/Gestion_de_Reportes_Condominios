import unittest

from app.models.report import EstadoEnum, Reporte


class ReportStatusPersistenceTests(unittest.TestCase):
    def test_database_enum_uses_public_status_values(self):
        enum_type = Reporte.__table__.c.estado.type
        self.assertEqual(
            enum_type.enums,
            ["Pendiente", "En Progreso", "Resuelto", "Rechazado"],
        )
        self.assertEqual(EstadoEnum.En_Progreso.value, "En Progreso")


if __name__ == "__main__":
    unittest.main()
