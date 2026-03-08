# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Tower Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import TowerAction, TowerObservation


class TowerEnv(EnvClient[TowerAction, TowerObservation]):
    """
    Client for the Tower Environment.

    Dependency resolution with 6 tasks in a hidden DAG.
    """

    def _step_payload(self, action: TowerAction) -> Dict:
        """Convert TowerAction to JSON payload for step message."""
        return {
            "task_id": action.task_id,
        }

    def _parse_result(self, payload: Dict) -> StepResult[TowerObservation]:
        """Parse server response into StepResult[TowerObservation]."""
        obs_data = payload.get("observation", {})
        observation = TowerObservation(
            completed_tasks=obs_data.get("completed_tasks", []),
            failed_task=obs_data.get("failed_task"),
            revealed_deps=obs_data.get("revealed_deps", []),
            turn=obs_data.get("turn", 0),
            max_turns=obs_data.get("max_turns", 12),
            all_complete=obs_data.get("all_complete", False),
            done=payload.get("done", False),
            reward=payload.get("reward"),
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
