
  

from services.simulator.memory.memory import Memory
from services.simulator.timeline.timeline import Timeline
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


class Simulator:
    def __init__(self):
        self.memory = Memory()
        self.timeline = Timeline()
        self.functions = {}

    # -----------------------------
    # Entry point
    # -----------------------------

    def run(self, program: Program):
        for stmt in program.body:
            self.execute_statement(stmt)

        return self.timeline.get()

    # -----------------------------
    # Statement execution
    # -----------------------------

    def execute_statement(self, stmt):
        if isinstance(stmt, Assignment):
            self.execute_assignment(stmt)
        elif isinstance(stmt, ForLoop):
            self.execute_for(stmt)
        elif isinstance(stmt, FunctionDef):
             self.functions[stmt.name] = stmt

        elif isinstance(stmt, ReturnStatement):
             return self.execute_return(stmt)
        else:
            raise Exception(f"Unsupported statement: {type(stmt)}")

    def execute_assignment(self, stmt: Assignment):
        value = self.evaluate_expression(stmt.value)
        self.memory.set(stmt.target, value)

        # Record step
        self.timeline.record(stmt.line, self.memory.snapshot())

    def execute_for(self, stmt: ForLoop):
        # Placeholder implementation for ForLoop
        # This needs to be implemented based on the ForLoop node structure
        raise NotImplementedError("ForLoop execution not yet implemented")

    # -----------------------------
    # Expression evaluation
    # -----------------------------

    # def evaluate_expression(self, expr):
    #     if isinstance(expr, Literal):
    #         return expr.value

    #     if isinstance(expr, Variable):
    #         return self.memory.get(expr.name)

    #     if isinstance(expr, BinaryOperation):
    #         left = self.evaluate_expression(expr.left)
    #         right = self.evaluate_expression(expr.right)

    #         if expr.operator == "+":
    #             return left + right
    #         if expr.operator == "-":
    #             return left - right
    #         if expr.operator == "*":
    #             return left * right
    #         if expr.operator == "/":
    #             return left / right

    #     raise Exception(f"Unsupported expression: {type(expr)}")

    def evaluate_expression(self, expr):

    # 🔥 Handle range
     if isinstance(expr, dict) and expr.get("type") == "range":
        args = [self.evaluate_expression(a) for a in expr["args"]]
        if isinstance(expr, FunctionCall):
           return self.execute_function_call(expr)

        if len(args) == 1:
            return range(args[0])
        elif len(args) == 2:
            return range(args[0], args[1])
        elif len(args) == 3:
            return range(args[0], args[1], args[2])

    # Existing logic continues...
    
    def execute_for(self, stmt: ForLoop):
     iterable = self.evaluate_expression(stmt.iterable)

     for value in iterable:
        # Assign loop variable
        self.memory.set(stmt.variable, value)

        # Record loop variable assignment
        self.timeline.record(stmt.line, self.memory.snapshot())

        # Execute loop body
        for s in stmt.body:
            self.execute_statement(s)
            
            
            
            
            
            
    
def execute_function_call(self, call: FunctionCall):
        func = self.functions.get(call.name)

        if not func:
            raise Exception(f"Function '{call.name}' not defined")

        # Evaluate arguments
        arg_values = [self.evaluate_expression(a) for a in call.args]

        # Create new frame
        self.memory.push_frame()

        # Assign parameters
        for param, value in zip(func.params, arg_values):
            self.memory.set(param, value)

        # Record function entry
        self.timeline.record(func.line, self.memory.snapshot())

        # Execute body
        return_value = None
        for stmt in func.body:
            result = self.execute_statement(stmt)
            if result is not None:
                return_value = result
                break

        # Pop frame
        self.memory.pop_frame()
        return return_value
    
def execute_return(self, stmt: ReturnStatement):
    if stmt.value:
        return self.evaluate_expression(stmt.value)
    return None