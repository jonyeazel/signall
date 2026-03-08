# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Tower Environment Implementation.

Dependency resolution with 6 tasks and hidden DAG structure.
Agent must discover and execute tasks in valid order.
"""

import random
from typing import Dict, List, Set
from uuid import uuid4

from models import TowerAction, TowerObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class TowerEnvironment(Environment):
    """
    Tower building environment with dependency resolution.

    6 tasks (A-F) with hidden dependencies forming a DAG.
    Attempting a task succeeds if prerequisites are met,
    otherwise fails and reveals what's needed.
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True
    MAX_TURNS = 12
    TASK_LABELS = ["A", "B", "C", "D", "E", "F"]

    DAG_PRESETS = [
        # Linear chain: A -> B -> C -> D -> E -> F
        {"A": [], "B": ["A"], "C": ["B"], "D": ["C"], "E": ["D"], "F": ["E"]},
        # Two chains merging: (A->B->D), (C->D), D->E->F
        {"A": [], "B": ["A"], "C": [], "D": ["B", "C"], "E": ["D"], "F": ["E"]},
        # Wide base: A, B, C -> D -> E, F
        {"A": [], "B": [], "C": [], "D": ["A", "B", "C"], "E": ["D"], "F": ["D"]},
        # Diamond: A -> (B, C) -> D -> (E, F)
        {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"], "E": ["D"], "F": ["D"]},
        # Complex: A -> B, C -> D, (B, D) -> E -> F
        {"A": [], "B": ["A"], "C": [], "D": ["C"], "E": ["B", "D"], "F": ["E"]},
        # Inverted tree: (A, B) -> C, (C, D) -> E, E -> F
        {"A": [], "B": [], "C": ["A", "B"], "D": [], "E": ["C", "D"], "F": ["E"]},
    ]

    def __init__(self):
        """Initialize the tower environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._dependencies: Dict[str, List[str]] = {}
        self._label_map: Dict[str, str] = {}
        self._reverse_map: Dict[str, str] = {}
        self._completed: Set[str] = set()
        self._turn: int = 0
        self._last_failed: str | None = None
        self._last_revealed: List[str] = []

    def _shuffle_labels(self):
        """Create a random mapping from preset labels to displayed labels."""
        shuffled = self.TASK_LABELS.copy()
        random.shuffle(shuffled)

        self._label_map = {orig: shuffled[i] for i, orig in enumerate(self.TASK_LABELS)}
        self._reverse_map = {v: k for k, v in self._label_map.items()}

    def _generate_dag(self):
        """Select a random DAG preset and apply label shuffling."""
        preset = random.choice(self.DAG_PRESETS)
        self._shuffle_labels()

        self._dependencies = {}
        for orig_task, orig_deps in preset.items():
            new_task = self._label_map[orig_task]
            new_deps = [self._label_map[d] for d in orig_deps]
            self._dependencies[new_task] = new_deps

    def reset(self) -> TowerObservation:
        """Reset the environment and generate a new DAG."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._generate_dag()
        self._completed = set()
        self._turn = 0
        self._last_failed = None
        self._last_revealed = []

        return TowerObservation(
            completed_tasks=[],
            failed_task=None,
            revealed_deps=[],
            turn=0,
            max_turns=self.MAX_TURNS,
            all_complete=False,
            done=False,
            reward=0.0,
        )

    def step(self, action: TowerAction) -> TowerObservation:  # type: ignore[override]
        """
        Attempt to complete a task.

        Args:
            action: TowerAction with task_id to attempt

        Returns:
            TowerObservation with results
        """
        self._state.step_count += 1
        self._turn += 1

        task_id = action.task_id.upper()
        self._last_failed = None
        self._last_revealed = []

        if task_id not in self._dependencies:
            self._last_failed = task_id
            self._last_revealed = []
        elif task_id in self._completed:
            pass
        else:
            deps = self._dependencies[task_id]
            missing = [d for d in deps if d not in self._completed]

            if missing:
                self._last_failed = task_id
                self._last_revealed = missing
            else:
                self._completed.add(task_id)

        all_complete = len(self._completed) == 6
        done = all_complete or self._turn >= self.MAX_TURNS

        if done and all_complete:
            reward = 6.0 / self._turn
        elif done:
            reward = 0.0
        else:
            reward = 0.0

        return TowerObservation(
            completed_tasks=sorted(list(self._completed)),
            failed_task=self._last_failed,
            revealed_deps=self._last_revealed,
            turn=self._turn,
            max_turns=self.MAX_TURNS,
            all_complete=all_complete,
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
