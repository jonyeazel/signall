# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Transfer Environment Implementation.

Analogical reasoning. Sort 4 elements in 2 phases.
Phase 1 uses letters (A-D), Phase 2 uses numbers (1-4).
Same permutation both phases - tests transfer learning.
"""

import random
from uuid import uuid4

from models import TransferAction, TransferObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class TransferEnvironment(Environment):
    """
    Transfer learning environment.

    Generate a random permutation of [0,1,2,3].
    Phase 1: Map to letters (A-D), sort by swapping adjacent elements.
    Phase 2: Map to numbers (1-4), same permutation, sort again.

    Measures transfer: if you learned the sorting sequence in phase 1,
    you should use fewer moves in phase 2.

    Reward: optimal_moves / phase2_moves
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    LETTERS = ["A", "B", "C", "D"]
    NUMBERS = ["1", "2", "3", "4"]

    def __init__(self):
        """Initialize the transfer environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._permutation: list[int] = []
        self._current: list[str] = []
        self._target: list[str] = []
        self._phase: int = 1
        self._moves: int = 0
        self._phase1_moves: int = 0
        self._optimal_moves: int = 0

    def _calculate_optimal_moves(self, perm: list[int]) -> int:
        """Calculate minimum swaps needed using bubble sort count."""
        arr = perm.copy()
        swaps = 0
        n = len(arr)
        for i in range(n):
            for j in range(n - 1):
                if arr[j] > arr[j + 1]:
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
                    swaps += 1
        return swaps

    def _is_sorted(self) -> bool:
        """Check if current arrangement is sorted."""
        return self._current == self._target

    def reset(self) -> TransferObservation:
        """
        Reset the environment.

        Generate random permutation and start phase 1 with letters.
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)

        # Generate random permutation
        self._permutation = list(range(4))
        random.shuffle(self._permutation)

        # Calculate optimal moves for this permutation
        self._optimal_moves = self._calculate_optimal_moves(self._permutation)

        # Phase 1: letters
        self._phase = 1
        self._current = [self.LETTERS[i] for i in self._permutation]
        self._target = self.LETTERS.copy()
        self._moves = 0
        self._phase1_moves = 0

        return TransferObservation(
            current_arrangement=self._current.copy(),
            target=self._target.copy(),
            phase=1,
            moves=0,
            phase1_moves=0,
            done=False,
        )

    def step(self, action: TransferAction) -> TransferObservation:
        """
        Execute a swap.

        Args:
            action: TransferAction with swap_index (0-2)

        Returns:
            TransferObservation with current state
        """
        self._state.step_count += 1

        # Perform swap
        idx = action.swap_index
        self._current[idx], self._current[idx + 1] = self._current[idx + 1], self._current[idx]
        self._moves += 1

        done = False
        reward = 0.0

        # Check if sorted
        if self._is_sorted():
            if self._phase == 1:
                # Transition to phase 2
                self._phase1_moves = self._moves
                self._phase = 2
                self._current = [self.NUMBERS[i] for i in self._permutation]
                self._target = self.NUMBERS.copy()
                self._moves = 0
            else:
                # Phase 2 complete
                done = True
                # Reward: optimal / phase2_moves
                phase2_moves = self._moves
                if phase2_moves > 0:
                    reward = self._optimal_moves / phase2_moves
                else:
                    reward = 1.0  # Already sorted (edge case)

        return TransferObservation(
            current_arrangement=self._current.copy(),
            target=self._target.copy(),
            phase=self._phase,
            moves=self._moves,
            phase1_moves=self._phase1_moves,
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
