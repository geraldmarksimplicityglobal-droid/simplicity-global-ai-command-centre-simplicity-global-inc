"""GEN SYSTEM studio scheduler: safe planning mode, no agent execution by default."""
from __future__ import annotations

import argparse
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

STUDIOS = (
    ("ST-001", "architecture", ()),
    ("ST-002", "android", ("ST-001",)),
    ("ST-003", "windows", ("ST-001",)),
    ("ST-004", "dsh", ("ST-001",)),
    ("ST-005", "codex-bridge", ("ST-001", "ST-004")),
    ("ST-006", "governance", ("ST-001",)),
    ("ST-007", "security", ("ST-005", "ST-006")),
    ("ST-008", "testing", ("ST-002", "ST-003", "ST-004", "ST-005", "ST-006")),
    ("ST-009", "build", ("ST-002", "ST-003", "ST-004", "ST-008")),
    ("ST-010", "documentation", ("ST-001", "ST-007", "ST-008", "ST-009")),
)

@dataclass(frozen=True)
class Task:
    id: str
    studio: str
    workspace: str
    dependencies: tuple[str, ...]
    mode: str = "READ_ONLY"
    requires_review: bool = True
    requires_human_approval: bool = True

def build_registry() -> list[Task]:
    return [Task(i, name, f"workspaces/{name}", deps) for i, name, deps in STUDIOS]

def validate_registry(tasks: Iterable[Task]) -> None:
    items = list(tasks)
    ids = {t.id for t in items}
    if len(ids) != len(items):
        raise ValueError("Duplicate task IDs")
    for task in items:
        missing = set(task.dependencies) - ids
        if missing:
            raise ValueError(f"{task.id} has missing dependencies: {sorted(missing)}")
        if task.id in task.dependencies:
            raise ValueError(f"{task.id} depends on itself")
    # Detect cycles with depth-first traversal.
    by_id = {t.id: t for t in items}
    visiting: set[str] = set()
    visited: set[str] = set()
    def visit(node: str) -> None:
        if node in visiting:
            raise ValueError("Dependency cycle detected")
        if node in visited:
            return
        visiting.add(node)
        for dep in by_id[node].dependencies:
            visit(dep)
        visiting.remove(node)
        visited.add(node)
    for task_id in ids:
        visit(task_id)

def plan(tasks: list[Task], max_workers: int) -> dict:
    if max_workers < 1 or max_workers > 1000:
        raise ValueError("max_workers must be between 1 and 1000")
    validate_registry(tasks)
    levels: list[list[str]] = []
    completed: set[str] = set()
    remaining = {t.id: t for t in tasks}
    while remaining:
        ready = sorted(
            task_id for task_id, task in remaining.items()
            if set(task.dependencies) <= completed
        )
        if not ready:
            raise ValueError("No schedulable tasks; dependency graph is invalid")
        for start in range(0, len(ready), max_workers):
            batch = ready[start:start + max_workers]
            levels.append(batch)
            completed.update(batch)
            for task_id in batch:
                remaining.pop(task_id)
    return {
        "mode": "PLAN_ONLY",
        "max_logical_workers": 1000,
        "configured_concurrency": max_workers,
        "agent_processes_started": 0,
        "filesystem_changes": 0,
        "batches": levels,
        "tasks": [asdict(t) for t in tasks],
        "gates": {
            "read_only_default": True,
            "patch_review_required": True,
            "human_approval_required": True,
            "shared_workspace_writes": False,
            "deployment_enabled": False,
        },
    }

def prepare_workspace_roots(root: Path, tasks: list[Task]) -> list[str]:
    """Create only missing, task-scoped directories; never overwrite files."""
    root = root.resolve()
    created = []
    for task in tasks:
        target = (root / task.workspace).resolve()
        if root not in target.parents:
            raise ValueError("Workspace escapes the configured root")
        target.mkdir(parents=True, exist_ok=True)
        created.append(str(target))
    return created

def main() -> int:
    parser = argparse.ArgumentParser(description="GEN SYSTEM X1000 studio planner")
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--prepare-workspaces", action="store_true")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    tasks = build_registry()
    result = plan(tasks, args.workers)
    if args.prepare_workspaces:
        result["workspace_directories"] = prepare_workspace_roots(Path(args.root), tasks)
    print(json.dumps(result, indent=2) if args.json else
          f"GEN SYSTEM PLAN ONLY: {len(tasks)} tasks, {len(result['batches'])} batches, "
          f"concurrency={args.workers}; agents started=0; changes=0")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
