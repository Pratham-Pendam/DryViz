from dataclasses import dataclass
from typing import Any


@dataclass
class TraceEvent:
    step: int
    line: int
    event_type: str
    variables: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "line": self.line,
            "event": self.event_type,
            "variables": self.variables,
        }