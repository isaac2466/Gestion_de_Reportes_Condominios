import unittest

from app.models.report import EstadoEnum, Reporte


class ReportStatusTests(unittest.TestCase):
    def test_database_enum_uses_public_status_values(self):
        status_type = Reporte.__table__.c.estado.type

        self.assertEqual(
            status_type.enums,
            ["Pendiente", "En Progreso", "Resuelto", "Rechazado"],
        )
        self.assertIs(status_type._object_value_for_elem("En Progreso"), EstadoEnum.En_Progreso)


if __name__ == "__main__":
    unittest.main()
