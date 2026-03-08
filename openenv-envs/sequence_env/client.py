# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Sequence Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import SequenceAction, SequenceObservation


class SequenceEnv(EnvClient[SequenceAction, SequenceObservation]):
    """
    Client for the Sequence Environment.

    Pattern recognition with 8 rounds of increasing difficulty.
    """

    def _step_payload(self, action: SequenceAction) -> Dict:
        """Convert SequenceAction to JSON payload for step message."""
        return {
            "answer": action.answer,
        }

    def _parse_result(self, payload: Dict) -> StepResult[SequenceObservation]:
        """Parse server response into StepResult[SequenceObservation]."""
        obs_data = payload.get("observation", {})
        observation = SequenceObservation(
            sequence=obs_data.get("sequence", []),
            round=obs_data.get("round", 0),
            total_rounds=obs_data.get("total_rounds", 8),
            correct=obs_data.get("correct"),
            score=obs_data.get("score", 0),
            choices=obs_data.get("choices", []),
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
