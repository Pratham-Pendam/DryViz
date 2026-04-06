from fastapi import FastAPI
from pydantic import BaseModel

from services.language_python.transformer.ast_to_ir import PythonASTToIR
from services.simulator.core.simulator import Simulator

app = FastAPI()


# -----------------------------
# Request schema
# -----------------------------

class CodeRequest(BaseModel):
    code: str


# -----------------------------
# Endpoint
# -----------------------------

@app.post("/dry-run")
def dry_run(request: CodeRequest):
    try:
        # Step 1: Convert to IR
        transformer = PythonASTToIR()
        program = transformer.transform(request.code)

        # Step 2: Simulate
        simulator = Simulator()
        timeline = simulator.run(program)

        return {
            "success": True,
            "timeline": timeline
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }