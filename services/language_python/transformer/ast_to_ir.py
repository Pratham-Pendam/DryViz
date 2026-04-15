# import ast

# from services.simulator.ir.nodes import (
#     Program,
#     Assignment,
#     Literal,
#     Variable,
#     BinaryOperation,
#     IfStatement,
#     ForLoop,
#     FunctionDef,
#     FunctionCall,
#     ReturnStatement
# )


# class PythonASTToIR(ast.NodeVisitor):
#     def __init__(self):
#         self.statements = []

#     def transform(self, code: str) -> Program:
#         tree = ast.parse(code)
#         self.visit(tree)
#         return Program(body=self.statements)

#     def visit_Module(self, node):
#         for stmt in node.body:
#             ir_stmt = self.visit(stmt)
#             if ir_stmt:
#                 self.statements.append(ir_stmt)

#     def visit_Assign(self, node):
#         target = node.targets[0].id
#         value = self.visit(node.value)

#         return Assignment(target=target, value=value, line=node.lineno)

#     def visit_Constant(self, node):
#         return Literal(value=node.value)

#     def visit_Name(self, node):
#         return Variable(name=node.id)

#     def visit_BinOp(self, node):
#         left = self.visit(node.left)
#         right = self.visit(node.right)

#         operator = self.get_operator(node.op)

#         return BinaryOperation(left=left, operator=operator, right=right)

#     def get_operator(self, op):
#         if isinstance(op, ast.Add):
#             return "+"
#         if isinstance(op, ast.Sub):
#             return "-"
#         if isinstance(op, ast.Mult):
#             return "*"
#         if isinstance(op, ast.Div):
#             return "/"

#         raise Exception(f"Unsupported operator: {type(op)}")

#     def visit_Compare(self, node):
#         left = self.visit(node.left)
#         right = self.visit(node.comparators[0])

#         operator = self.get_comparator(node.ops[0])

#         return BinaryOperation(left=left, operator=operator, right=right)

#     def get_comparator(self, op):
#         if isinstance(op, ast.Gt):
#             return ">"
#         if isinstance(op, ast.Lt):
#             return "<"
#         if isinstance(op, ast.Eq):
#             return "=="

#         raise Exception(f"Unsupported comparator: {type(op)}")

#     def visit_If(self, node):
#         condition = self.visit(node.test)

#         then_body = [self.visit(stmt) for stmt in node.body if self.visit(stmt)]
#         else_body = [self.visit(stmt) for stmt in node.orelse if self.visit(stmt)]

#         return IfStatement(
#             condition=condition,
#             then_body=then_body,
#             else_body=else_body,
#             line=node.lineno
#         )

#     def visit_For(self, node):
#         variable = node.target.id
#         iterable = self.visit(node.iter)

#         body = [self.visit(stmt) for stmt in node.body if self.visit(stmt)]

#         return ForLoop(
#             variable=variable,
#             iterable=iterable,
#             body=body,
#             line=node.lineno
#         )

#     def visit_FunctionDef(self, node):
#         name = node.name
#         params = [arg.arg for arg in node.args.args]

#         body = [self.visit(stmt) for stmt in node.body if self.visit(stmt)]

#         return FunctionDef(name=name, params=params, body=body, line=node.lineno)

#     def visit_Call(self, node):
#         if not isinstance(node.func, ast.Name):
#             raise Exception("Unsupported call type")

#         name = node.func.id
#         args = [self.visit(arg) for arg in node.args]

#         if name == "range":
#             return {"type": "range", "args": args}

#         return FunctionCall(name=name, args=args)

#     def visit_Return(self, node):
#         value = self.visit(node.value) if node.value else None
#         return ReturnStatement(value=value, line=node.lineno)

import ast

from services.simulator.ir.nodes import (
    Program,
    Assignment,
    Literal,
    Variable,
    BinaryOperation,
    IfStatement,
    ForLoop,
    FunctionDef,
    FunctionCall,
    ReturnStatement
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
    # Module (top-level)
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
    # Binary Operations (+ - * /)
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

    # -----------------------------
    # Comparisons (>, <, ==)
    # -----------------------------
    def visit_Compare(self, node):
        left = self.visit(node.left)
        right = self.visit(node.comparators[0])

        operator = self.get_comparator(node.ops[0])

        return BinaryOperation(
            left=left,
            operator=operator,
            right=right
        )

    def get_comparator(self, op):
        if isinstance(op, ast.Gt):
            return ">"
        if isinstance(op, ast.Lt):
            return "<"
        if isinstance(op, ast.Eq):
            return "=="

        raise Exception(f"Unsupported comparator: {type(op)}")

    # -----------------------------
    # If Statement
    # -----------------------------
    def visit_If(self, node):
        condition = self.visit(node.test)

        then_body = []
        else_body = []

        for stmt in node.body:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                then_body.append(ir_stmt)

        for stmt in node.orelse:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                else_body.append(ir_stmt)

        return IfStatement(
            condition=condition,
            then_body=then_body,
            else_body=else_body,
            line=node.lineno
        )

    # -----------------------------
    # For Loop
    # -----------------------------
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

    # -----------------------------
    # Function Definition
    # -----------------------------
    def visit_FunctionDef(self, node):
        name = node.name
        params = [arg.arg for arg in node.args.args]

        body = []
        for stmt in node.body:
            ir_stmt = self.visit(stmt)
            if ir_stmt:
                body.append(ir_stmt)

        return FunctionDef(
            name=name,
            params=params,
            body=body,
            line=node.lineno
        )

    # -----------------------------
    # Function Call + range()
    # -----------------------------
    def visit_Call(self, node):
        if not isinstance(node.func, ast.Name):
            raise Exception("Unsupported call type")

        name = node.func.id
        args = [self.visit(arg) for arg in node.args]

        # 🔥 Special case: range()
        if name == "range":
            return {
                "type": "range",
                "args": args
            }

        return FunctionCall(
            name=name,
            args=args
        )

    # -----------------------------
    # Return
    # -----------------------------
    def visit_Return(self, node):
        value = self.visit(node.value) if node.value else None

        return ReturnStatement(
            value=value,
            line=node.lineno
        )