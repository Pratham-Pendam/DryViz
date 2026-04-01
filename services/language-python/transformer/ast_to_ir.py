import ast
from services.simulator.ir.nodes import ForLoop
from services.simulator.ir.nodes import (
    FunctionDef,
    FunctionCall,
    ReturnStatement
)

from services.simulator.ir.nodes import (
    Program,
    Assignment,
    Literal,
    Variable,
    BinaryOperation
)


class PythonASTToIR(ast.NodeVisitor):
    def __init__(self):
        self.statements = []

    # -----------------------------
    # Entry point
    # -----------------------------

    def transform(self, code: str) -> Program:
        tree = ast.parse(code)
        self.visit(tree)
        return Program(body=self.statements)

    # -----------------------------
    # Visit module (top-level code)
    # -----------------------------

    def visit_Module(self, node):
        for stmt in node.body:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                self.statements.append(ir_stmt)

    # -----------------------------
    # Assignment
    # -----------------------------

    def visit_Assign(self, node):
        target = node.targets[0].id
        value = self.visit(node.value)

        return Assignment(
            target=target,
            value=value,
            line=node.lineno
        )

    # -----------------------------
    # Literals
    # -----------------------------

    def visit_Constant(self, node):
        return Literal(value=node.value)

    # -----------------------------
    # Variables
    # -----------------------------

    def visit_Name(self, node):
        return Variable(name=node.id)

    # -----------------------------
    # Binary operations
    # -----------------------------

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)

        operator = self.get_operator(node.op)

        return BinaryOperation(
            left=left,
            operator=operator,
            right=right
        )

    # -----------------------------
    # Operator mapping
    # -----------------------------

    def get_operator(self, op):
        if isinstance(op, ast.Add):
            return "+"
        if isinstance(op, ast.Sub):
            return "-"
        if isinstance(op, ast.Mult):
            return "*"
        if isinstance(op, ast.Div):
            return "/"

        raise Exception(f"Unsupported operator: {type(op)}")
    
    def visit_For(self, node):
        variable = node.target.id

        iterable = self.visit(node.iter)

        body = []
        for stmt in node.body:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                body.append(ir_stmt)

        return ForLoop(
            variable=variable,
            iterable=iterable,
            body=body,
            line=node.lineno
        )
    
    def visit_Call(self, node):
      if isinstance(node.func, ast.Name) and node.func.id == "range":
        args = [self.visit(arg) for arg in node.args]

        return {
            "type": "range",
            "args": args
        }

    raise Exception("Only range() supported for now")


    def visit_FunctionDef(self, node):
        name = node.name
        params = [arg.arg for arg in node.args.args]
        body = []
        for stmt in node.body:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                body.append(ir_stmt)
        return FunctionDef(name=name, params=params, body=body, line=node.lineno)
    
    def visit_Call(self, node):
        if not isinstance(node.func, ast.Name):
            raise Exception("Unsupported call type")

        name = node.func.id
        args = [self.visit(arg) for arg in node.args]

        if name == "range":
            return {"type": "range", "args": args}

        return FunctionCall(name=name, args=args)
    
    def visit_Return(self, node):
        value = self.visit(node.value) if node.value else None
        return ReturnStatement(value=value,line=node.lineno)