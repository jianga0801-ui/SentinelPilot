import abc
from typing import Any


class IMProvider(abc.ABC):
    @abc.abstractmethod
    def send_message(self, title: str, text: str) -> None:
        """Sends a message to the IM platform."""
        pass

    @abc.abstractmethod
    def get_status(self) -> dict[str, Any]:
        """Returns the status and capabilities of the provider."""
        pass
