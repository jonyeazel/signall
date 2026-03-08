# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Auction Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import AuctionAction, AuctionObservation


class AuctionEnv(EnvClient[AuctionAction, AuctionObservation]):
    """
    Client for the Auction Environment.

    Resource allocation with 8 items. Maximize value of purchases.
    """

    def _step_payload(self, action: AuctionAction) -> Dict:
        """Convert AuctionAction to JSON payload for step message."""
        return {
            "buy": action.buy,
        }

    def _parse_result(self, payload: Dict) -> StepResult[AuctionObservation]:
        """Parse server response into StepResult[AuctionObservation]."""
        obs_data = payload.get("observation", {})
        observation = AuctionObservation(
            appeal=obs_data.get("appeal", 0),
            cost=obs_data.get("cost", 0),
            budget_remaining=obs_data.get("budget_remaining", 0),
            item_index=obs_data.get("item_index", 0),
            total_items=obs_data.get("total_items", 8),
            purchased_items=obs_data.get("purchased_items", []),
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
