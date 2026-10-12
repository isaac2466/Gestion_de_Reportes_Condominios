import json
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config.database import Base
from app.models.conversation import ConversacionReporte, ConversationStatus
from app.models.user import Habitante
from app.routes.conversations import conversation_to_response, get_conversation
from app.schemas.conversation_ai import ReportDraft
from app.services import conversation_ai_service as ai
from app.services import conversation_service as service


ADDRESS = "Calle Prueba 123, interior 4, Colonia Centro, CP 64000"


def conversation():
    return ConversacionReporte(
        id=1, id_habitante=7, estado=ConversationStatus.collecting,
        version_borrador=1, datos_contexto={}, campos_faltantes=[],
        fecha_creacion=datetime(2026, 10, 11), fecha_actualizacion=datetime(2026, 10, 11),
    )


class ResidentLocationTests(unittest.TestCase):
    def setUp(self):
        self.conversation = conversation()
        self.db = MagicMock()
        self.resident = SimpleNamespace(Direccion=ADDRESS)
        self.db.query.return_value.filter.return_value.first.return_value = self.resident

    def resolve(self, text, location=None, context=None, update=None):
        return service.resolve_resident_location(
            self.db, self.conversation,
            ReportDraft(description="Incidencia", location=location, context=context or {}),
            text, location_update=update,
        )

    def test_own_home_references_and_missing_extraction(self):
        for text in (
            "Se fue la luz en mi casa hace tres días.",
            "Hay una fuga en mi domicilio.", "En mi hogar", "mi vivienda",
            "  EN   MI CASA  ", "No hay luz en mi casa.",
        ):
            with self.subTest(text=text):
                draft = self.resolve(text)
                self.assertEqual(draft.location, ADDRESS)
                self.assertEqual(draft.context, {
                    "location_source": "resident_address",
                    "location_label": "Domicilio del residente",
                })
                self.assertEqual(service.calculate_missing_fields(draft), [])

    def test_relative_extraction_and_concrete_priority(self):
        self.assertEqual(self.resolve("Se fue la luz", "En mi casa", update="En mi casa").location, ADDRESS)
        concrete = self.resolve("Hay una lámpara junto al parque, cerca de mi casa.", "Junto al parque", update="Junto al parque")
        self.assertEqual(concrete.location, "Junto al parque")
        self.assertEqual(concrete.context, {})
        self.db.reset_mock()
        existing = self.resolve("En mi casa", "Entrada norte")
        self.assertEqual(existing.location, "Entrada norte")
        self.db.query.assert_not_called()

    def test_other_homes_and_relative_landmarks_are_not_own_address(self):
        for text in (
            "Hay un problema en casa de mi vecino.", "casa de mi mamá", "otra casa",
            "la casa de enfrente", "en la casa", "mi casa de la playa", "mi casamiento",
            "No es en mi casa, es junto al parque.", "No ocurre en mi domicilio.",
            "No está pasando en mi casa.", "No está dentro de mi vivienda.",
            "El problema está enfrente de la casa de mi vecino.",
            "La fuga está afuera de la casa de mi mamá.",
        ):
            with self.subTest(text=text):
                self.assertIsNone(self.resolve(text).location)
        self.db.query.assert_not_called()

    def test_relative_own_home_references_use_the_registered_address(self):
        references = (
            ("El problema está enfrente de mi casa.", "enfrente de mi casa"),
            ("La fuga está afuera de mi casa.", "afuera de mi casa"),
            ("La luminaria está cerca de mi casa.", "cerca de mi casa"),
            ("El poste está frente a su casa.", "frente a su casa"),
            ("Hay una falla al lado de mi domicilio.", "al lado de mi domicilio"),
            ("El reporte es por mi vivienda.", "por mi vivienda"),
        )
        for text, extracted_location in references:
            for location, update in ((None, None), (extracted_location, extracted_location)):
                with self.subTest(text=text, location=location):
                    draft = self.resolve(text, location, update=update)
                    self.assertEqual(draft.location, ADDRESS)
                    self.assertEqual(draft.context["location_source"], "resident_address")

    def test_relative_home_correction_uses_the_latest_reference(self):
        draft = self.resolve(
            "No es dentro de mi casa, la fuga está afuera de mi casa.",
            "afuera de mi casa",
            update="afuera de mi casa",
        )
        self.assertEqual(draft.location, ADDRESS)

    def test_missing_address_or_resident_requests_location(self):
        for resident in (None, SimpleNamespace(Direccion="  "), SimpleNamespace(Direccion=None)):
            with self.subTest(resident=resident):
                self.db.query.return_value.filter.return_value.first.return_value = resident
                draft = self.resolve("El problema es en mi casa.", "En mi casa", update="En mi casa")
                self.assertIsNone(draft.location)
                self.assertEqual(service.calculate_missing_fields(draft), ["location"])
                self.assertEqual(draft.context, {})

    def test_correction_removes_only_location_metadata(self):
        saved = self.resolve("En mi casa", context={"since_when": "ayer"})
        service.save_draft_to_conversation(self.conversation, saved)
        changed = service.merge_draft(saved, {"location": "Caseta de entrada"})
        result = service.resolve_resident_location(
            self.db, self.conversation, changed,
            "No es en mi casa, es en la caseta de entrada.", "Caseta de entrada",
        )
        self.assertEqual(result.location, "Caseta de entrada")
        self.assertEqual(result.context, {"since_when": "ayer"})
        self.assertEqual(saved.context["location_source"], "resident_address")

    def test_negative_correction_without_ai_does_not_reuse_home(self):
        saved = self.resolve("En mi casa")
        service.save_draft_to_conversation(self.conversation, saved)
        result = service.resolve_resident_location(
            self.db, self.conversation, saved, "No es en mi casa, es junto al parque."
        )
        self.assertIsNone(result.location)
        self.assertEqual(result.context, {})

    def test_snapshot_is_not_replaced_after_profile_change(self):
        saved = self.resolve("En mi casa")
        service.save_draft_to_conversation(self.conversation, saved)
        self.resident.Direccion = "Otra dirección"
        self.db.reset_mock()
        for update in (None, "En mi casa"):
            merged = service.merge_draft(saved, {"location": update})
            resolved = service.resolve_resident_location(self.db, self.conversation, merged, "En mi casa", update)
            self.assertEqual(resolved.location, ADDRESS)
            self.assertEqual(resolved.context, saved.context)
        self.db.query.assert_not_called()

    def test_model_cannot_set_location_metadata(self):
        draft = service.merge_draft(ReportDraft(), {
            "context": {"location_source": "resident_address", "location_label": "Inventado", "since_when": "ayer"}
        })
        self.assertEqual(draft.context, {"since_when": "ayer"})

    def process(self, text, extraction=None, form=None):
        self.db.add.side_effect = lambda message: setattr(message, "id", 10)
        with patch.object(service, "get_recent_messages", return_value=[]), \
                patch.object(service, "validate_report", return_value={"decision": "valid"}), \
                patch.object(service, "analyze_conversation", return_value=extraction), \
                patch.object(service, "analyze_report", return_value=None):
            return service.process_conversation_message(self.db, self.conversation, text, form_data=form)

    def test_natural_message_becomes_summary_without_location_form(self):
        result = self.process("Se fue la luz en mi casa hace tres días.", {"description": "Se fue la luz hace tres días.", "location": None})
        self.assertEqual(result["status"], "ready_for_confirmation")
        self.assertEqual(result["draft"]["location"], ADDRESS)
        self.assertEqual(result["assistant_messages"][0]["type"], "summary")
        self.assertEqual(self.conversation.version_borrador, 2)
        self.assertEqual(self.conversation.datos_contexto["location_source"], "resident_address")

    def test_fallback_keeps_manual_form_and_resolves_location(self):
        result = self.process("Se fue la luz en mi casa.")
        self.assertEqual(result["missing_fields"], ["description"])
        self.assertEqual(result["draft"]["location"], ADDRESS)
        completed = self.process("Completé los datos solicitados.", form={"description": "Se fue la luz"})
        self.assertEqual(completed["status"], "ready_for_confirmation")
        self.assertEqual(completed["draft"]["location"], ADDRESS)

    def test_form_data_and_correction_versions(self):
        first = self.process("Completé los datos solicitados.", form={"description": "Hay una fuga", "location": "Mi domicilio"})
        self.assertEqual(first["draft"]["location"], ADDRESS)
        self.assertEqual(self.conversation.version_borrador, 2)
        second = self.process("Completé los datos solicitados.", form={"location": "Caseta de entrada"})
        self.assertEqual(second["draft"]["location"], "Caseta de entrada")
        self.assertEqual(second["draft"]["context"], {})
        self.assertEqual(self.conversation.version_borrador, 3)

    def test_analysis_does_not_receive_registered_address(self):
        draft = self.resolve("Hay una fuga en mi domicilio.")
        with patch.object(service, "analyze_report", return_value=None) as analyze:
            result, available = service.complete_draft_analysis(draft)
        self.assertNotIn(ADDRESS, str(analyze.call_args))
        self.assertEqual(analyze.call_args.args[2], "Domicilio del residente")
        self.assertEqual(result.location, ADDRESS)
        self.assertFalse(available)

    def test_extractor_does_not_receive_address_or_emit_source(self):
        draft = self.resolve("En mi casa")
        response = SimpleNamespace(message=SimpleNamespace(content=json.dumps({
            "location": None, "context": {"location_source": "resident_address", "location_label": "Inventado"}
        })))
        with patch.object(ai.client, "chat", return_value=response) as chat:
            result = ai.analyze_conversation(draft, [], "Desde ayer")
        prompt = chat.call_args.kwargs["messages"][1]["content"]
        self.assertNotIn(ADDRESS, prompt)
        self.assertNotIn("location_source", prompt)
        self.assertEqual(result["context"], {})
        self.assertEqual(draft.location, ADDRESS)

    def test_database_roundtrip_and_get_preserve_snapshot(self):
        # Isolated SQL/JSON persistence; never touches the configured MySQL database.
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        try:
            with Session(engine) as db:
                db.add(Habitante(id_habitante=7, Nombre="Prueba", Direccion=ADDRESS, Email="test@example.invalid", Password_hash="unused"))
                db.add(self.conversation)
                draft = service.resolve_resident_location(db, self.conversation, ReportDraft(description="Incidencia"), "En mi casa")
                service.save_draft_to_conversation(self.conversation, draft)
                db.commit()
                db.expire_all()
                loaded = db.get(ConversacionReporte, 1)
                self.assertEqual(service.draft_from_conversation(loaded).context, draft.context)
                db.get(Habitante, 7).Direccion = "Dirección nueva"
                db.commit()
                response = get_conversation(1, db=db)
                self.assertEqual(response.draft.location, ADDRESS)
                self.assertEqual(response.draft.context, draft.context)
                self.assertEqual(conversation_to_response(loaded).draft.version, 2)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
