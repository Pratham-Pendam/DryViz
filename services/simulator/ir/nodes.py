from dataclasses import dataclass
from typing import List, Optional, Union
from typing import List



# -----------------------------
# Base Classes
# -----------------------------

class IRNode:
    pass


class Statement(IRNode):
    pass


class Expression(IRNode):
    pass


# -----------------------------
# Program Root
# -----------------------------

@dataclass
class Program(IRNode):
    body: List[Statement]


# -----------------------------
# Statements
# -----------------------------

@dataclass
class Assignment(Statement):
    target: str
    value: Expression
    line: int


@dataclass
class IfStatement(Statement):
    condition: Expression
    then_body: List[Statement]
    else_body: List[Statement]
    line: int


@dataclass
class WhileLoop(Statement):
    condition: Expression
    body: List[Statement]
    line: int


@dataclass
class ForLoop(Statement):
    variable: str
    iterable: Expression
    body: List[Statement]
    line: int


@dataclass
class ReturnStatement(Statement):
    value: Optional[Expression]
    line: int


# -----------------------------
# Expressions
# -----------------------------

@dataclass
class Literal(Expression):
    value: Union[int, float, str, bool]


@dataclass
class Variable(Expression):
    name: str


@dataclass
class BinaryOperation(Expression):
    left: Expression
    operator: str
    right: Expression



@dataclass
class FunctionDef(Statement):
    name: str
    params: List[str]
    body: List[Statement]
    line: int


@dataclass
class FunctionCall(Expression):
    name: str
    args: List[Expression]


@dataclass
class ReturnStatement(Statement):
    value: Optional[Expression]
    line: int