
from dataclasses import dataclass
from typing import Any


@dataclass
class TraceEvent:
    step: int
    line: int
    event_type: str
    variables: dict[str, Any]
    function: str = "<module>"

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "line": self.line,
            "event": self.event_type,
            "function": self.function,
            "variables": self.variables,
        }
