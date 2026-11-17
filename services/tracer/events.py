
from dataclasses import dataclass
from typing import Any


@dataclass
class TraceEvent:
    step: int
    line: int
    event_type: str
    variables: dict[str, Any]
    function: str = "<module>"
    frame_id: int = 0
    parent_frame_id: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "line": self.line,
            "event": self.event_type,
            "function": self.function,
            "frame_id": self.frame_id,
            "parent_frame_id": self.parent_frame_id,
            "variables": self.variables,
        }
