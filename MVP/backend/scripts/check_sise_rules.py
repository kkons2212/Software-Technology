#!/usr/bin/env python3
"""Automated AST Control Flow Audit Script (SISE Rules Checker - REF-07.3).

Audits Layer 2 (Services) and Layer 3 (Repositories) Python source files against
Single Intent Structured Exit (SISE) metric gates defined in `documents/refactor_rule.md`:
1. Max Exit Points: K <= 2 per function.
2. Cyclomatic Complexity: M <= 6 per function.
3. Maximum Nesting Depth: <= 3 indentation levels.
4. Nested Ternaries: Strictly prohibited (depth <= 1).

Exits with code 0 if all functions comply; exits with code 1 if violations exist.
"""

from __future__ import annotations

import ast
import os
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class FunctionViolation:
    file_path: str
    function_name: str
    line_number: int
    rule: str
    measured_value: int | str
    allowed_value: int | str
    message: str


class SiseAstAuditor:
    """AST visitor measuring SISE control-flow metrics per function."""

    BLOCK_NODES = (
        ast.If,
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.Try,
        ast.With,
        ast.AsyncWith,
    )

    BRANCH_NODES = (
        ast.If,
        ast.For,
        ast.AsyncFor,
        ast.While,
        ast.ExceptHandler,
        ast.With,
        ast.AsyncWith,
        ast.Assert,
        ast.IfExp,
    )

    def __init__(self, max_k: int = 2, max_m: int = 6, max_nesting: int = 3) -> None:
        self.max_k = max_k
        self.max_m = max_m
        self.max_nesting = max_nesting
        self.violations: list[FunctionViolation] = []
        self.total_functions_audited = 0

    def audit_file(self, file_path: Path) -> None:
        """Parse and audit a single Python source file."""
        try:
            with open(file_path, encoding="utf-8") as f:
                tree = ast.parse(f.read(), filename=str(file_path))
        except Exception as exc:
            print(f"[ERROR] Failed to parse {file_path}: {exc}")
            return

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                self._audit_function(file_path, node)

    def _audit_function(
        self, file_path: Path, fn_node: ast.FunctionDef | ast.AsyncFunctionDef
    ) -> None:
        """Compute SISE metrics for a single function definition."""
        self.total_functions_audited += 1
        fn_name = fn_node.name
        line_num = fn_node.lineno

        # 1. Exit points (K): count Returns strictly within this function's scope
        return_nodes = self._find_scoped_nodes(fn_node, ast.Return)
        k_count = len(return_nodes)
        if k_count > self.max_k:
            self.violations.append(
                FunctionViolation(
                    file_path=str(file_path),
                    function_name=fn_name,
                    line_number=line_num,
                    rule="Max Exit Points (K)",
                    measured_value=k_count,
                    allowed_value=self.max_k,
                    message=f"Function '{fn_name}' has {k_count} return points (max allowed: {self.max_k}).",
                )
            )

        # 2. Cyclomatic Complexity (M = 1 + decision points)
        m_complexity = self._calculate_cyclomatic_complexity(fn_node)
        if m_complexity > self.max_m:
            self.violations.append(
                FunctionViolation(
                    file_path=str(file_path),
                    function_name=fn_name,
                    line_number=line_num,
                    rule="Cyclomatic Complexity (M)",
                    measured_value=m_complexity,
                    allowed_value=self.max_m,
                    message=f"Function '{fn_name}' has cyclomatic complexity M={m_complexity} (max allowed: {self.max_m}).",
                )
            )

        # 3. Maximum Nesting Depth
        max_depth = self._calculate_max_nesting_depth(fn_node)
        if max_depth > self.max_nesting:
            self.violations.append(
                FunctionViolation(
                    file_path=str(file_path),
                    function_name=fn_name,
                    line_number=line_num,
                    rule="Nesting Depth",
                    measured_value=max_depth,
                    allowed_value=self.max_nesting,
                    message=f"Function '{fn_name}' has nesting depth of {max_depth} levels (max allowed: {self.max_nesting}).",
                )
            )

        # 4. Nested Ternaries (IfExp within IfExp)
        if self._has_nested_ternaries(fn_node):
            self.violations.append(
                FunctionViolation(
                    file_path=str(file_path),
                    function_name=fn_name,
                    line_number=line_num,
                    rule="Nested Ternaries",
                    measured_value="Nested",
                    allowed_value="<= 1 Level",
                    message=f"Function '{fn_name}' contains prohibited multi-level nested inline ternaries.",
                )
            )

    def _find_scoped_nodes(self, fn_node: ast.AST, target_type: type) -> list[ast.AST]:
        """Find nodes matching target_type without descending into child functions."""
        results: list[ast.AST] = []
        for child in ast.iter_child_nodes(fn_node):
            if isinstance(child, ast.FunctionDef | ast.AsyncFunctionDef):
                continue  # Do not cross into nested inner function scopes
            if isinstance(child, target_type):
                results.append(child)
            results.extend(self._find_scoped_nodes(child, target_type))
        return results

    def _calculate_cyclomatic_complexity(self, fn_node: ast.AST) -> int:
        """Calculate McCabe Cyclomatic Complexity M = 1 + decisions."""
        decisions = 0
        for node in self._find_scoped_nodes(fn_node, ast.AST):
            if isinstance(node, self.BRANCH_NODES):
                decisions += 1
            elif isinstance(node, ast.BoolOp):
                # 'a and b and c' has 2 decision points
                decisions += len(node.values) - 1
            elif isinstance(node, ast.comprehension):
                decisions += 1 + len(node.ifs)

        return 1 + decisions

    def _calculate_max_nesting_depth(
        self, node: ast.AST, current_depth: int = 0
    ) -> int:
        """Compute maximum nesting depth of compound control blocks."""
        max_d = current_depth
        for child in ast.iter_child_nodes(node):
            if isinstance(child, ast.FunctionDef | ast.AsyncFunctionDef):
                continue
            if isinstance(child, self.BLOCK_NODES):
                child_d = self._calculate_max_nesting_depth(child, current_depth + 1)
            else:
                child_d = self._calculate_max_nesting_depth(child, current_depth)
            if child_d > max_d:
                max_d = child_d
        return max_d

    def _has_nested_ternaries(self, fn_node: ast.AST) -> bool:
        """Check whether any inline ternary (IfExp) embeds another ternary."""
        ternaries = self._find_scoped_nodes(fn_node, ast.IfExp)
        for t in ternaries:
            for child in ast.walk(t):
                if child is not t and isinstance(child, ast.IfExp):
                    return True
        return False


def main() -> int:
    """CLI Entrypoint for CI/CD Pipeline."""
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    backend_root = Path(__file__).resolve().parent.parent
    app_dir = backend_root / "app"

    target_dirs = [
        app_dir / "services",
        app_dir / "repositories",
    ]

    # Allow custom targets via CLI arguments
    if len(sys.argv) > 1:
        target_dirs = [Path(arg) for arg in sys.argv[1:]]

    auditor = SiseAstAuditor(max_k=2, max_m=6, max_nesting=3)

    print("=" * 80)
    print(">>> SISE AST CONTROL FLOW AUDITOR (Engineering Gate REF-07.3)")
    print("Gates: Max Return Points K <= 2 | Cyclomatic M <= 6 | Nesting <= 3")
    print("=" * 80)

    for target_path in target_dirs:
        if not target_path.exists():
            print(f"[WARN] Target path does not exist: {target_path}")
            continue

        if target_path.is_file():
            if target_path.suffix == ".py":
                auditor.audit_file(target_path)
        else:
            for py_file in target_path.rglob("*.py"):
                if py_file.name.startswith("__"):
                    continue
                auditor.audit_file(py_file)

    print(
        f"\n[INFO] Audit Complete: {auditor.total_functions_audited} functions evaluated."
    )

    if not auditor.violations:
        print("\n[PASS] 100% of evaluated functions strictly comply with SISE rules!\n")
        return 0

    print(f"\n[FAIL] Found {len(auditor.violations)} SISE metric violation(s):\n")
    print("-" * 80)
    for v in auditor.violations:
        rel_path = os.path.relpath(v.file_path, backend_root)
        print(f"  * [{v.rule}] {rel_path}:{v.line_number} in `{v.function_name}`")
        print(f"    Measured: {v.measured_value} | Limit: {v.allowed_value}")
        print(f"    Detail: {v.message}\n")
    print("-" * 80)
    return 1


if __name__ == "__main__":
    sys.exit(main())
