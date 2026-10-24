"""MVP/backend/scripts/check_architecture.py.

Enforce 3-tier architectural layering rules for FastAPI backend per dev_rules.md:
1. Controllers: Must not import repositories/ or models/, must not call db.*
2. Services: May import SessionLocal for BackgroundTasks (Section 5.3),
   but MUST NOT call db.query/add/commit/delete
3. Repositories: Must not raise HTTPException
"""

import ast
import os
import sys

# Ensure UTF-8 output compatibility across Windows local consoles and CI runners
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
violations = []


def check_controllers():
    ctrl_dir = os.path.join(BASE_DIR, "controllers")
    if not os.path.exists(ctrl_dir):
        return
    for root, _, files in os.walk(ctrl_dir):
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, BASE_DIR).replace("\\", "/")
            try:
                with open(path, encoding="utf-8") as file_handle:
                    tree = ast.parse(file_handle.read(), filename=path)
            except (SyntaxError, OSError) as e:
                violations.append(f"[PARSE ERROR] app/{rel_path}: {e}")
                continue
            for node in ast.walk(tree):
                # Ban importing repositories or models into controllers
                if (
                    isinstance(node, ast.ImportFrom)
                    and node.module
                    and (
                        node.module.startswith("app.repositories")
                        or node.module.startswith("app.models")
                    )
                ):
                    violations.append(
                        f"[CONTROLLER LEAK] app/{rel_path}:{node.lineno} -> "
                        f"Controller must not import '{node.module}'. Route through Service layer."
                    )
                # Ban calling db.query, db.commit, db.add, etc. in controllers
                if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Attribute)
                    and node.func.attr
                    in {"query", "commit", "add", "delete", "flush", "execute"}
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "db"
                ):
                    violations.append(
                        f"[CONTROLLER LEAK] app/{rel_path}:{node.lineno} -> "
                        f"Controller must not execute direct 'db.{node.func.attr}()'."
                    )


def check_services():
    svc_dir = os.path.join(BASE_DIR, "services")
    if not os.path.exists(svc_dir):
        return
    for root, _, files in os.walk(svc_dir):
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, BASE_DIR).replace("\\", "/")
            try:
                with open(path, encoding="utf-8") as file_handle:
                    tree = ast.parse(file_handle.read(), filename=path)
            except (SyntaxError, OSError) as e:
                violations.append(f"[PARSE ERROR] app/{rel_path}: {e}")
                continue
            for node in ast.walk(tree):
                # Services can import SessionLocal (Section 5.3 BackgroundTasks), but BANNED from db.query/add/delete
                if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Attribute)
                    and node.func.attr
                    in {
                        "query",
                        "add",
                        "delete",
                        "commit",
                        "rollback",
                        "flush",
                        "execute",
                    }
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "db"
                ):
                    violations.append(
                        f"[SERVICE LEAK] app/{rel_path}:{node.lineno} -> "
                        f"Service must not execute direct 'db.{node.func.attr}()'. Delegate to Repository."
                    )


def check_repositories():
    repo_dir = os.path.join(BASE_DIR, "repositories")
    if not os.path.exists(repo_dir):
        return
    for root, _, files in os.walk(repo_dir):
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, BASE_DIR).replace("\\", "/")
            try:
                with open(path, encoding="utf-8") as file_handle:
                    tree = ast.parse(file_handle.read(), filename=path)
            except (SyntaxError, OSError) as e:
                violations.append(f"[PARSE ERROR] app/{rel_path}: {e}")
                continue
            for node in ast.walk(tree):
                # Repositories must not raise HTTPException
                if (
                    isinstance(node, ast.Raise)
                    and node.exc
                    and isinstance(node.exc, ast.Call)
                    and getattr(node.exc.func, "id", None) == "HTTPException"
                ):
                    violations.append(
                        f"[REPOSITORY LEAK] app/{rel_path}:{node.lineno} -> "
                        "Repository must not raise HTTPException. Return None or raise domain exception."
                    )


if __name__ == "__main__":
    check_controllers()
    check_services()
    check_repositories()

    if violations:
        print("❌ DETECTED 3-TIER ARCHITECTURAL BOUNDARY VIOLATIONS IN BACKEND:")
        for v in violations:
            print("  " + v)
        sys.exit(1)
    else:
        print("✅ Backend 3-Tier Layering check passed: 0 architectural leaks.")
        sys.exit(0)
