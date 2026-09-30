from fastapi import APIRouter
from pydantic import BaseModel

from services.tracer.python.python_tracer import PythonTracer


router = APIRouter()


class TraceRequest(BaseModel):
    code: str


@router.post("/trace")
def trace_code(request: TraceRequest):
    tracer = PythonTracer()

    events = tracer.trace(request.code)

    return {
        "events": [
            event.to_dict()
            for event in events
        ]
    }