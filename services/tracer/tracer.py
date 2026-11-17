
from abc import ABC, abstractmethod

from services.tracer.events import TraceEvent


class Tracer(ABC):
    @abstractmethod
    def trace(self, code: str) -> list[TraceEvent]:
        """Trace code and return its execution events."""
        raise NotImplementedError
