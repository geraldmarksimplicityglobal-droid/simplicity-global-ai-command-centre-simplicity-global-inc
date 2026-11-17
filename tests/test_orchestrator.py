import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from sg_studio.orchestrator import (
    Task, build_registry, plan, prepare_workspace_roots, validate_registry
)

class OrchestratorTests(unittest.TestCase):
    def test_initial_ten_workstreams(self):
        tasks = build_registry()
        self.assertEqual(len(tasks), 10)
        self.assertEqual(len({t.id for t in tasks}), 10)

    def test_plan_is_non_executing(self):
        result = plan(build_registry(), 10)
        self.assertEqual(result["mode"], "PLAN_ONLY")
        self.assertEqual(result["agent_processes_started"], 0)
        self.assertEqual(result["filesystem_changes"], 0)

    def test_dependency_order(self):
        result = plan(build_registry(), 10)
        positions = {task_id: i for i, batch in enumerate(result["batches"]) for task_id in batch}
        for task in build_registry():
            for dependency in task.dependencies:
                self.assertLess(positions[dependency], positions[task.id])

    def test_worker_bounds(self):
        with self.assertRaises(ValueError):
            plan(build_registry(), 1001)
        with self.assertRaises(ValueError):
            plan(build_registry(), 0)

    def test_cycle_rejected(self):
        tasks = [Task("A", "a", "workspaces/a", ("B",)),
                 Task("B", "b", "workspaces/b", ("A",))]
        with self.assertRaises(ValueError):
            validate_registry(tasks)

    def test_workspace_paths_are_scoped(self):
        tasks = [Task("A", "a", "../escape", ())]
        with TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                prepare_workspace_roots(Path(tmp), tasks)

if __name__ == "__main__":
    unittest.main()
