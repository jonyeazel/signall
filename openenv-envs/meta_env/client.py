# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Meta Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import MetaAction, MetaObservation


class MetaEnv(EnvClient[MetaAction, MetaObservation]):
    """
    Client for the Meta Environment.

    Metacognition quiz. Answer questions with calibrated confidence.
    """

    def _step_payload(self, action: MetaAction) -> Dict:
        """Convert MetaAction to JSON payload for step message."""
        return {
            "confidence": action.confidence,
            "answer": action.answer,
        }

    def _parse_result(self, payload: Dict) -> StepResult[MetaObservation]:
        """Parse server response into StepResult[MetaObservation]."""
        obs_data = payload.get("observation", {})
        observation = MetaObservation(
            question=obs_data.get("question", ""),
            options=obs_data.get("options", []),
            round=obs_data.get("round", 0),
            total_rounds=obs_data.get("total_rounds", 8),
            last_correct=obs_data.get("last_correct"),
            last_points=obs_data.get("last_points"),
            total_points=obs_data.get("total_points", 0),
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
