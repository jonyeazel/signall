# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Map Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import MapAction, MapObservation


class MapEnv(EnvClient[MapAction, MapObservation]):
    """
    Client for the Map Environment.

    Grid navigation with fog of war. Navigate to goal efficiently.
    """

    def _step_payload(self, action: MapAction) -> Dict:
        """Convert MapAction to JSON payload for step message."""
        return {
            "direction": action.direction,
        }

    def _parse_result(self, payload: Dict) -> StepResult[MapObservation]:
        """Parse server response into StepResult[MapObservation]."""
        obs_data = payload.get("observation", {})
        observation = MapObservation(
            visible_cells=obs_data.get("visible_cells", []),
            position=obs_data.get("position", {}),
            moves=obs_data.get("moves", 0),
            max_moves=obs_data.get("max_moves", 50),
            grid_size=obs_data.get("grid_size", 8),
            reached_goal=obs_data.get("reached_goal", False),
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
