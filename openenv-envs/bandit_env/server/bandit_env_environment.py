# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Bandit Environment Implementation.

Multi-armed bandit with 6 arms. Each arm has a hidden mean reward.
The agent must learn which arm yields the highest expected reward.
"""

import random
from uuid import uuid4

from models import BanditAction, BanditObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class BanditEnvironment(Environment):
    """
    Multi-armed bandit environment with 6 arms.

    Each arm has a hidden mean reward drawn from a shuffled list of base means.
    Pulling an arm returns a sample from gaussian(mean, variance=2.0).
    Episode ends after 25 steps.
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    BASE_MEANS = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9]
    VARIANCE = 2.0
    TOTAL_ROUNDS = 25

    def __init__(self):
        """Initialize the bandit environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._arm_means: list[float] = []
        self._total_score: float = 0.0
        self._last_reward: float = 0.0
        self._last_source_id: int = 0

    def reset(self) -> BanditObservation:
        """
        Reset the environment.

        Shuffles the arm means and returns initial observation.
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._arm_means = self.BASE_MEANS.copy()
        random.shuffle(self._arm_means)
        self._total_score = 0.0
        self._last_reward = 0.0
        self._last_source_id = 0

        return BanditObservation(
            reward=0.0,
            source_id=0,
            round=0,
            total_rounds=self.TOTAL_ROUNDS,
            total_score=0.0,
            done=False,
        )

    def step(self, action: BanditAction) -> BanditObservation:  # type: ignore[override]
        """
        Execute a step by pulling the selected arm.

        Args:
            action: BanditAction with source_id indicating which arm to pull

        Returns:
            BanditObservation with the sampled reward
        """
        self._state.step_count += 1

        arm_id = action.source_id
        mean = self._arm_means[arm_id]
        reward = random.gauss(mean, self.VARIANCE ** 0.5)

        self._total_score += reward
        self._last_reward = reward
        self._last_source_id = arm_id

        done = self._state.step_count >= self.TOTAL_ROUNDS

        return BanditObservation(
            reward=reward,
            source_id=arm_id,
            round=self._state.step_count,
            total_rounds=self.TOTAL_ROUNDS,
            total_score=self._total_score,
            done=done,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
