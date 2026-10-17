
import sys
from typing import Any

from services.tracer.events import TraceEvent
from services.tracer.tracer import Tracer


TRACE_FILENAME = "<dryrun-user-code>"


class PythonTracer(Tracer):
    def __init__(self) -> None:
        self.events: list[TraceEvent] = []
        self.step = 0

    def trace(self, code: str) -> list[TraceEvent]:
        self.events = []
        self.step = 0

        compiled_code = compile(code, TRACE_FILENAME, "exec")

        namespace = {
            "__name__": "__main__",
            "__builtins__": __builtins__,
        }

        previous_trace = sys.gettrace()

        try:
            sys.settrace(self._trace)
            exec(compiled_code, namespace)
        finally:
            sys.settrace(previous_trace)

        return self.events

    def _trace(self, frame, event, arg):
        if frame.f_code.co_filename != TRACE_FILENAME:
            return None

        if event == "line":
            self._record(
                line=frame.f_lineno,
                event_type="line",
                variables=frame.f_locals,
                function=(
                    "<module>"
                    if frame.f_code.co_name == "<module>"
                    else frame.f_code.co_name
                ),
            )

        elif event == "return":
            self._record(
                line=frame.f_lineno,
                event_type="return",
                variables=frame.f_locals,
                function=(
                    "<module>"
                    if frame.f_code.co_name == "<module>"
                    else frame.f_code.co_name
                ),
            )

        return self._trace

    def _record(
        self,
        line: int,
        event_type: str,
        variables: dict[str, Any],
        function: str,
    ) -> None:
        self.events.append(
            TraceEvent(
                step=self.step,
                line=line,
                event_type=event_type,
                variables=self._snapshot_locals(variables),
                function=function,
            )
        )
        self.step += 1

    def _snapshot_locals(
        self, locals_data: dict[str, Any]
    ) -> dict[str, Any]:
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
                return [self._safe_value(item) for item in value]

            if isinstance(value, dict):
                return {
                    str(key): self._safe_value(item)
                    for key, item in value.items()
                }

            return repr(value)
        except Exception:
            return "<unavailable>"
