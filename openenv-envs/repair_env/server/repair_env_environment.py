# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Repair Environment Implementation.

Pipeline debugging. 6 components in series, one is broken.
Testing a component reveals if it and all upstream components are working.
"""

import random
from uuid import uuid4

from models import RepairAction, RepairObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class RepairEnvironment(Environment):
    """
    Pipeline repair environment.

    6 components in series (0 -> 1 -> 2 -> 3 -> 4 -> 5).
    One component is randomly broken.

    Testing a component:
    - Returns "pass" if the component AND all upstream components are working
    - Returns "fail" if the component OR any upstream component is broken

    The optimal strategy is binary search (3 tests to find the broken component).

    Reward:
    - If correct: optimal_tests(3) / tests_used
    - If wrong: 0
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    NUM_COMPONENTS = 6
    MAX_TESTS = 6
    OPTIMAL_TESTS = 3  # Binary search optimal

    def __init__(self):
        """Initialize the repair environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._broken_component: int = 0
        self._test_results: dict[int, str] = {}
        self._tests_used: int = 0
        self._identified: bool = False
        self._correct: bool | None = None

    def reset(self) -> RepairObservation:
        """
        Reset the environment.

        Randomly selects one broken component (0-5).
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)

        self._broken_component = random.randint(0, self.NUM_COMPONENTS - 1)
        self._test_results = {i: "untested" for i in range(self.NUM_COMPONENTS)}
        self._tests_used = 0
        self._identified = False
        self._correct = None

        return RepairObservation(
            test_results=self._test_results.copy(),
            tests_used=0,
            max_tests=self.MAX_TESTS,
            identified=False,
            correct=None,
            done=False,
        )

    def step(self, action: RepairAction) -> RepairObservation:
        """
        Execute a step.

        Args:
            action: RepairAction with action_type ('test' or 'identify') and component

        Returns:
            RepairObservation with current state
        """
        self._state.step_count += 1

        if action.action_type == "test" and not self._identified:
            component = action.component
            self._tests_used += 1

            # Test passes if component and all upstream are working
            # Component is at index i, upstream are 0..i-1
            # If broken component is <= tested component, test fails
            if self._broken_component <= component:
                self._test_results[component] = "fail"
            else:
                self._test_results[component] = "pass"

        elif action.action_type == "identify":
            self._identified = True
            self._correct = (action.component == self._broken_component)

        done = self._identified or self._tests_used >= self.MAX_TESTS

        # Calculate reward
        reward = 0.0
        if done and self._identified:
            if self._correct:
                reward = self.OPTIMAL_TESTS / max(self._tests_used, 1)
            else:
                reward = 0.0

        return RepairObservation(
            test_results=self._test_results.copy(),
            tests_used=self._tests_used,
            max_tests=self.MAX_TESTS,
            identified=self._identified,
            correct=self._correct,
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
