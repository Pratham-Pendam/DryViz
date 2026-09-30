from services.tracer.events import TraceEvent


class Tracer:
    def trace(self, code: str) -> list[TraceEvent]:
        raise NotImplementedError