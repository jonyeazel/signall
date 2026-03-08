# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Bandit Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import BanditAction, BanditObservation


class BanditEnv(EnvClient[BanditAction, BanditObservation]):
    """
    Client for the Bandit Environment.

    Multi-armed bandit with 6 arms. Pull arms to maximize total reward over 25 rounds.
    """

    def _step_payload(self, action: BanditAction) -> Dict:
        """Convert BanditAction to JSON payload for step message."""
        return {
            "source_id": action.source_id,
        }

    def _parse_result(self, payload: Dict) -> StepResult[BanditObservation]:
        """Parse server response into StepResult[BanditObservation]."""
        obs_data = payload.get("observation", {})
        observation = BanditObservation(
            reward=obs_data.get("reward", 0.0),
            source_id=obs_data.get("source_id", 0),
            round=obs_data.get("round", 0),
            total_rounds=obs_data.get("total_rounds", 25),
            total_score=obs_data.get("total_score", 0.0),
            done=payload.get("done", False),
            metadata=obs_data.get("metadata", {}),
        )

        return StepResult(
            observation=observation,
            reward=payload.get("reward"),
            done=payload.get("done", False),
        )

    def _parse_state(self, payload: Dict) -> State:
        """Parse server response into State object."""
        return State(
            episode_id=payload.get("episode_id"),
            step_count=payload.get("step_count", 0),
        )
