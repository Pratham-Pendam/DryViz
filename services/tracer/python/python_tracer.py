
import sys
from typing import Any

from services.tracer.events import TraceEvent
from services.tracer.tracer import Tracer


TRACE_FILENAME = "<dryrun-user-code>"


class PythonTracer(Tracer):
    def __init__(self) -> None:
        self.events: list[TraceEvent] = []
        self.step = 0
        self.next_frame_id = 1
        self.frame_ids: dict[int, int] = {}

    def trace(self, code: str) -> list[TraceEvent]:
        self.events = []
        self.step = 0
        self.next_frame_id = 1
        self.frame_ids = {}

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

        frame_key = id(frame)

        if event == "call":
            frame_id = self.next_frame_id
            self.next_frame_id += 1
            self.frame_ids[frame_key] = frame_id

            parent_frame_id = self.frame_ids.get(id(frame.f_back))

            self._record(
                frame=frame,
                event_type="call",
                frame_id=frame_id,
                parent_frame_id=parent_frame_id,
            )

        elif event == "line":
            frame_id = self.frame_ids.get(frame_key)

            if frame_id is not None:
                self._record(
                    frame=frame,
                    event_type="line",
                    frame_id=frame_id,
                    parent_frame_id=self.frame_ids.get(id(frame.f_back)),
                )

        elif event == "return":
            frame_id = self.frame_ids.get(frame_key)

            if frame_id is not None:
                self._record(
                    frame=frame,
                    event_type="return",
                    frame_id=frame_id,
                    parent_frame_id=self.frame_ids.get(id(frame.f_back)),
                )
                self.frame_ids.pop(frame_key, None)

        return self._trace

    def _record(
        self,
        frame,
        event_type: str,
        frame_id: int,
        parent_frame_id: int | None,
    ) -> None:
        function_name = (
            "<module>"
            if frame.f_code.co_name == "<module>"
            else frame.f_code.co_name
        )

        self.events.append(
            TraceEvent(
                step=self.step,
                line=frame.f_lineno,
                event_type=event_type,
                function=function_name,
                frame_id=frame_id,
                parent_frame_id=parent_frame_id,
                variables=self._snapshot_locals(frame.f_locals),
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

            if callable(value):
                return f"<function {getattr(value, '__name__', 'unknown')}>"

            return f"<{type(value).__name__}>"

        except Exception:
            return "<unavailable>"
 