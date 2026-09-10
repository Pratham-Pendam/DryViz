from services.simulator.memory.memory import Memory
from services.simulator.timeline.timeline import Timeline
from services.simulator.memory.heap import Heap

from services.simulator.ir.nodes import (
    Program,
    Assignment,
    Literal,
    Variable,
    BinaryOperation,
    IfStatement,
    WhileLoop,
    ForLoop,
    FunctionDef,
    FunctionCall,
    ReturnStatement,
    ListLiteral
)


# class Simulator:

#     def __init__(self):

#         self.memory = Memory()

#         self.timeline = Timeline()

#         self.functions = {}
class Simulator:
    def __init__(self):
        self.memory = Memory()

        # NEW
        self.heap = Heap()

        self.timeline = Timeline()
        self.functions = {}

    # -----------------------------
    # Entry Point
    # -----------------------------

    def run(self, program: Program):

        for stmt in program.body:

            result = self.execute_statement(stmt)

            # Stop execution if return at top level
            if result is not None:
                break

        return self.timeline.get()

    # -----------------------------
    # Execute Statements
    # -----------------------------

    def execute_statement(self, stmt):

        # -------------------------
        # Assignment
        # -------------------------

        if isinstance(stmt, Assignment):
            return self.execute_assignment(stmt)

        # -------------------------
        # If Statement
        # -------------------------

        elif isinstance(stmt, IfStatement):
            return self.execute_if(stmt)

        # -------------------------
        # While Loop
        # -------------------------

        elif isinstance(stmt, WhileLoop):
            return self.execute_while(stmt)

        # -------------------------
        # For Loop
        # -------------------------

        elif isinstance(stmt, ForLoop):
            return self.execute_for(stmt)

        # -------------------------
        # Function Definition
        # -------------------------

        elif isinstance(stmt, FunctionDef):

            self.functions[stmt.name] = stmt

            self.record_timeline(stmt.line)

        # -------------------------
        # Return Statement
        # -------------------------

        elif isinstance(stmt, ReturnStatement):
            return self.execute_return(stmt)

        else:
            raise Exception(
                f"Unsupported statement: {type(stmt)}"
            )

    # -----------------------------
    # Assignment Execution
    # -----------------------------

    def execute_assignment(self, stmt: Assignment):

        value = self.evaluate_expression(stmt.value)

        self.memory.set(stmt.target, value)

        self.record_timeline(stmt.line)

    # -----------------------------
    # If Statement Execution
    # -----------------------------

    def execute_if(self, stmt: IfStatement):

        # Evaluate condition
        condition = self.evaluate_expression(
            stmt.condition
        )

        # Record condition evaluation
        self.record_timeline(stmt.line)

        # TRUE branch
        if condition:

            for body_stmt in stmt.then_body:

                result = self.execute_statement(
                    body_stmt
                )

                # Important for returns
                if result is not None:
                    return result

        # FALSE branch
        else:

            for body_stmt in stmt.else_body:

                result = self.execute_statement(
                    body_stmt
                )

                if result is not None:
                    return result

    # -----------------------------
    # While Loop Execution
    # -----------------------------

    def execute_while(self, stmt: WhileLoop):

        while self.evaluate_expression(
            stmt.condition
        ):

            # Record successful condition
            self.record_timeline(stmt.line)

            for body_stmt in stmt.body:

                result = self.execute_statement(
                    body_stmt
                )

                # Handle returns inside loops
                if result is not None:
                    return result

    # -----------------------------
    # For Loop Execution
    # -----------------------------

    def execute_for(self, stmt: ForLoop):

        iterable = self.evaluate_expression(
            stmt.iterable
        )

        for value in iterable:

            # Assign loop variable
            self.memory.set(
                stmt.variable,
                value
            )

            # Record iteration
            self.record_timeline(stmt.line)

            # Execute body
            for body_stmt in stmt.body:

                result = self.execute_statement(
                    body_stmt
                )

                # Handle returns
                if result is not None:
                    return result

    # -----------------------------
    # Function Call Execution
    # -----------------------------

    def execute_function_call(
        self,
        call: FunctionCall
    ):

        func = self.functions.get(call.name)

        if not func:
            raise Exception(
                f"Function '{call.name}' not defined"
            )

        # Evaluate arguments
        arg_values = [
            self.evaluate_expression(arg)
            for arg in call.args
        ]

        # Push new frame
        self.memory.push_frame(call.name)

        # Assign parameters
        for param, value in zip(
            func.params,
            arg_values
        ):

            self.memory.set(param, value)

        # Record function entry
        self.record_timeline(func.line)

        return_value = None

        # Execute function body
        for stmt in func.body:

            result = self.execute_statement(stmt)

            # Return encountered
            if result is not None:

                return_value = result
                break

        # Pop frame
        self.memory.pop_frame()

        return return_value

    # -----------------------------
    # Return Execution
    # -----------------------------

    def execute_return(
        self,
        stmt: ReturnStatement
    ):

        if stmt.value:

            value = self.evaluate_expression(
                stmt.value
            )

            self.record_timeline(stmt.line)

            return value

        self.record_timeline(stmt.line)

        return None

    # -----------------------------
    # Expression Evaluation
    # -----------------------------

    def evaluate_expression(self, expr):
        
        


        # -------------------------
        # Literal
        # -------------------------

        if isinstance(expr, Literal):
            return expr.value
        
        

        # -------------------------
        # Variable
        # -------------------------

        if isinstance(expr, Variable):
            return self.memory.get(expr.name)
        
        if isinstance(expr, ListLiteral):

           values = [
               self.evaluate_expression(element)
               for element in expr.elements
           ]

           object_id = self.heap.allocate(values)

           return {
            "ref": object_id
          }


        # -------------------------
        # Binary Operations
        # -------------------------

        # if isinstance(expr, BinaryOperation):

        #     left = self.evaluate_expression(
        #         expr.left
        #     )

        #     right = self.evaluate_expression(
        #         expr.right
        #     )

        #     # ---------------------
        #     # Arithmetic
        #     # ---------------------

        #     if expr.operator == "+":
        #         return left + right

        #     if expr.operator == "-":
        #         return left - right

        #     if expr.operator == "*":
        #         return left * right

        #     if expr.operator == "/":
        #         return left / right

        #     if expr.operator == "%":
        #         return left % right

        #     # ---------------------
        #     # Comparisons
        #     # ---------------------

        #     if expr.operator == ">":
        #         return left > right

        #     if expr.operator == "<":
        #         return left < right

        #     if expr.operator == ">=":
        #         return left >= right

        #     if expr.operator == "<=":
        #         return left <= right

        #     if expr.operator == "==":
        #         return left == right

        #     if expr.operator == "!=":
        #         return left != right

        if isinstance(expr, BinaryOperation):

            left = self.evaluate_expression(expr.left)
            right = self.evaluate_expression(expr.right)

            if expr.operator == "+":
                result = left + right
            elif expr.operator == "-":
                result = left - right
            elif expr.operator == "*":
                result = left * right
            elif expr.operator == "/":
                result = left / right
            elif expr.operator == "%":
                result = left % right
            elif expr.operator == ">":
                result = left > right
            elif expr.operator == "<":
                result = left < right
            elif expr.operator == ">=":
                result = left >= right
            elif expr.operator == "<=":
                result = left <= right
            elif expr.operator == "==":
                result = left == right
            elif expr.operator == "!=":
                result = left != right
            else:
                raise Exception(
                    f"Unsupported binary operator: {expr.operator}"
                )

            self.timeline.record(
                event="binary_operation",
                left=left,
                operator=expr.operator,
                right=right,
                result=result,
                memory=self.memory.snapshot()
            )

            return result

        # -------------------------
        # Function Calls
        # -------------------------

        if isinstance(expr, FunctionCall):

            return self.execute_function_call(
                expr
            )

        # -------------------------
        # range()
        # -------------------------

        if (
            isinstance(expr, dict)
            and expr.get("type") == "range"
        ):

            args = [
                self.evaluate_expression(arg)
                for arg in expr["args"]
            ]

            if len(args) == 1:
                return range(args[0])

            if len(args) == 2:
                return range(args[0], args[1])

            if len(args) == 3:
                return range(
                    args[0],
                    args[1],
                    args[2]
                )

        raise Exception(
            f"Unsupported expression: {type(expr)}"
        )

    # -----------------------------
    # Timeline Recording
    # -----------------------------

    # def record_timeline(self, line):

    #     self.timeline.record(
    #         line,
    #         {
    #             "stack": self.memory.snapshot()
    #         }
    #     )
    
    def record_timeline(self, line):

     self.timeline.record(
        line=line,
        memory=self.memory.snapshot(),
        heap=self.heap.snapshot()
    )
