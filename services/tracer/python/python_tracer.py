import sys
from typing import Any

from services.tracer.events import TraceEvent
from services.tracer.tracer import Tracer


class PythonTracer(Tracer):
    def __init__(self) -> None:
        self.events: list[TraceEvent] = []
        self.step = 0
        self.previous_line: int | None = None
        self.previous_locals: dict[str, Any] = {}

    def trace(self, code: str) -> list[TraceEvent]:
        self.events = []
        self.step = 0
        self.previous_line = None
        self.previous_locals = {}

        compiled_code = compile(
            code,
            "<dryrun-user-code>",
            "exec",
        )

        sys.settrace(self._trace)

        try:
            exec(
                compiled_code,
                {
                    "__name__": "__main__",
                    "__builtins__": __builtins__,
                },
            )
        finally:
            sys.settrace(None)

        return self.events

    def _trace(self, frame, event, arg):
        if frame.f_code.co_filename != "<dryrun-user-code>":
            return self._trace

        if event == "line":
            current_line = frame.f_lineno
            current_locals = self._snapshot_locals(frame.f_locals)

            if self.previous_line is not None:
                self._record_event(
                    line=self.previous_line,
                    variables=current_locals,
                    event_type="line",
                )

            self.previous_line = current_line
            self.previous_locals = current_locals

        elif event == "return":
            if self.previous_line is not None:
                current_locals = self._snapshot_locals(frame.f_locals)

                self._record_event(
                    line=self.previous_line,
                    variables=current_locals,
                    event_type="line",
                )

            self.previous_line = None

        return self._trace

    def _record_event(
        self,
        line: int,
        variables: dict[str, Any],
        event_type: str,
    ) -> None:
        event = TraceEvent(
            step=self.step,
            line=line,
            event_type=event_type,
            variables=variables,
        )

        self.events.append(event)
        self.step += 1

    def _snapshot_locals(self, locals_data: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {}

        for name, value in locals_data.items():
            if name.startswith("__"):
                continue

            result[name] = self._safe_value(value)

        return result

    def _safe_value(self, value: Any) -> Any:
        try:
            if isinstance(value, (str, int, float, bool, type(None))):
                return value

            if isinstance(value, (list, tuple)):
                return [
                    self._safe_value(item)
                    for item in value
                ]

            if isinstance(value, dict):
                return {
                    str(key): self._safe_value(item)
                    for key, item in value.items()
                }

            return repr(value)

        except Exception:
            return "<unavailable>"