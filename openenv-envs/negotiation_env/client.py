# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Negotiation Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import NegotiationAction, NegotiationObservation


class NegotiationEnv(EnvClient[NegotiationAction, NegotiationObservation]):
    """
    Client for the Negotiation Environment.

    Trade with a hidden-strategy bot to maximize your resource value.
    """

    def _step_payload(self, action: NegotiationAction) -> Dict:
        """Convert NegotiationAction to JSON payload for step message."""
        return {
            "give_iron": action.give_iron,
            "give_crystal": action.give_crystal,
            "give_gold": action.give_gold,
            "want_iron": action.want_iron,
            "want_crystal": action.want_crystal,
            "want_gold": action.want_gold,
        }

    def _parse_result(self, payload: Dict) -> StepResult[NegotiationObservation]:
        """Parse server response into StepResult[NegotiationObservation]."""
        obs_data = payload.get("observation", {})
        observation = NegotiationObservation(
            player_resources=obs_data.get("player_resources", {"iron": 0, "crystal": 0, "gold": 0}),
            bot_resources=obs_data.get("bot_resources", {"iron": 0, "crystal": 0, "gold": 0}),
            round=obs_data.get("round", 0),
            total_rounds=obs_data.get("total_rounds", 5),
            last_trade_accepted=obs_data.get("last_trade_accepted"),
            player_value=obs_data.get("player_value", 0),
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
