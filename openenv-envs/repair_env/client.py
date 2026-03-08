# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Repair Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import RepairAction, RepairObservation


class RepairEnv(EnvClient[RepairAction, RepairObservation]):
    """
    Client for the Repair Environment.

    Pipeline debugging. Find the broken component using binary search.
    """

    def _step_payload(self, action: RepairAction) -> Dict:
        """Convert RepairAction to JSON payload for step message."""
        return {
            "action_type": action.action_type,
            "component": action.component,
        }

    def _parse_result(self, payload: Dict) -> StepResult[RepairObservation]:
        """Parse server response into StepResult[RepairObservation]."""
        obs_data = payload.get("observation", {})

        # Convert string keys to int keys for test_results
        raw_results = obs_data.get("test_results", {})
        test_results = {int(k): v for k, v in raw_results.items()}

        observation = RepairObservation(
            test_results=test_results,
            tests_used=obs_data.get("tests_used", 0),
            max_tests=obs_data.get("max_tests", 6),
            identified=obs_data.get("identified", False),
            correct=obs_data.get("correct"),
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
