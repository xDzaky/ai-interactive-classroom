"""AST-based security sandbox validator for ManimGX Python scene code (V6).

Enforces strict static allowlisting before any generated or user-edited
ManimGX Python scene is executed:
- Only whitelisted imports: manimgx, math, numpy, typing, dataclasses
- Blocks all dangerous builtins: eval, exec, compile, __import__, open, getattr, etc.
- Blocks all dunder attribute access (__class__, __subclasses__, __globals__, etc.)
- Requires a Scene subclass implementing construct(self).
"""
from __future__ import annotations

import ast
from dataclasses import dataclass, field

ALLOWED_IMPORT_ROOTS: frozenset[str] = frozenset(
    {"manimgx", "math", "numpy", "typing", "dataclasses"}
)

BLOCKED_CALL_NAMES: frozenset[str] = frozenset(
    {
        "eval",
        "exec",
        "compile",
        "__import__",
        "open",
        "getattr",
        "setattr",
        "delattr",
        "globals",
        "locals",
        "vars",
        "input",
        "breakpoint",
        "memoryview",
    }
)


@dataclass
class SandboxValidationResult:
    valid: bool
    violations: list[str] = field(default_factory=list)
    scene_classes: list[str] = field(default_factory=list)


class _ManimGxAstValidator(ast.NodeVisitor):
    def __init__(self) -> None:
        self.violations: list[str] = []
        self.scene_classes: list[str] = []

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = alias.name.split(".")[0]
            if root not in ALLOWED_IMPORT_ROOTS:
                self.violations.append(f"Forbidden import: '{alias.name}'")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        module = node.module or ""
        root = module.split(".")[0]
        if root not in ALLOWED_IMPORT_ROOTS:
            self.violations.append(f"Forbidden import from: '{module}'")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALL_NAMES:
            self.violations.append(f"Forbidden builtin call: '{node.func.id}()'")
        elif isinstance(node.func, ast.Attribute) and node.func.attr in BLOCKED_CALL_NAMES:
            self.violations.append(f"Forbidden call attribute: '.{node.func.attr}()'")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if node.attr.startswith("__") and node.attr.endswith("__"):
            self.violations.append(f"Forbidden dunder attribute access: '.{node.attr}'")
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        is_scene = any(
            (isinstance(b, ast.Name) and b.id in {"Scene", "ThreeDScene"})
            or (isinstance(b, ast.Attribute) and b.attr in {"Scene", "ThreeDScene"})
            for b in node.bases
        )
        if is_scene:
            has_construct = any(
                isinstance(item, ast.FunctionDef) and item.name == "construct"
                for item in node.body
            )
            if has_construct:
                self.scene_classes.append(node.name)
        self.generic_visit(node)


def validate_manimgx_code(source_code: str) -> SandboxValidationResult:
    """Validate ManimGX Python scene source code via AST inspection."""
    if not source_code or not source_code.strip():
        return SandboxValidationResult(valid=False, violations=["Empty scene source code"])

    try:
        tree = ast.parse(source_code, mode="exec")
    except SyntaxError as exc:
        return SandboxValidationResult(
            valid=False,
            violations=[f"Python syntax error at line {exc.lineno}: {exc.msg}"],
        )

    validator = _ManimGxAstValidator()
    validator.visit(tree)

    if not validator.scene_classes:
        validator.violations.append(
            "Scene must define at least one Scene/ThreeDScene subclass with a construct(self) method"
        )

    return SandboxValidationResult(
        valid=len(validator.violations) == 0,
        violations=validator.violations,
        scene_classes=validator.scene_classes,
    )
