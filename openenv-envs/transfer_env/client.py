# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Transfer Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import TransferAction, TransferObservation


class TransferEnv(EnvClient[TransferAction, TransferObservation]):
    """
    Client for the Transfer Environment.

    Analogical reasoning. Sort elements in 2 phases to test transfer learning.
    """

    def _step_payload(self, action: TransferAction) -> Dict:
        """Convert TransferAction to JSON payload for step message."""
        return {
            "swap_index": action.swap_index,
        }

    def _parse_result(self, payload: Dict) -> StepResult[TransferObservation]:
        """Parse server response into StepResult[TransferObservation]."""
        obs_data = payload.get("observation", {})
        observation = TransferObservation(
            current_arrangement=obs_data.get("current_arrangement", []),
            target=obs_data.get("target", []),
            phase=obs_data.get("phase", 1),
            moves=obs_data.get("moves", 0),
            phase1_moves=obs_data.get("phase1_moves", 0),
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
