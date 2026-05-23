from types import SimpleNamespace

from sentinel_pilot.adapters.base import SecurityDeviceAdapter
from sentinel_pilot.api.dependencies import get_investigation_service
from sentinel_pilot.services.investigation_service import InvestigationService


def test_investigation_service_depends_on_adapter_protocol():
    assert InvestigationService.__init__.__annotations__["alert_source"] is SecurityDeviceAdapter


def test_get_investigation_service_reads_service_from_app_state():
    fake_service = object()
    request = SimpleNamespace(
        app=SimpleNamespace(
            state=SimpleNamespace(investigation_service=fake_service),
        )
    )

    assert get_investigation_service(request) is fake_service
