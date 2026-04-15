from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.language_python.transformer.ast_to_ir import PythonASTToIR
from services.simulator.core.simulator import Simulator

app = FastAPI()

# ✅ CORS (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Request schema
# -----------------------------
class CodeRequest(BaseModel):
    code: str

# -----------------------------
# Test route
# -----------------------------
@app.get("/")
def read_root():
    return {"status": "Backend running 🚀"}

# -----------------------------
# Dry Run API
# -----------------------------
@app.post("/dry-run")
def dry_run(request: CodeRequest):
    try:
        transformer = PythonASTToIR()
        program = transformer.transform(request.code)

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