# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Negotiation Environment.

Trading with a hidden-strategy bot. Negotiate trades to maximize value.
"""

from typing import Dict, Optional

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class NegotiationAction(Action):
    """Action for the Negotiation environment - propose a trade."""

    give_iron: int = Field(default=0, description="Amount of iron to give", ge=0)
    give_crystal: int = Field(default=0, description="Amount of crystal to give", ge=0)
    give_gold: int = Field(default=0, description="Amount of gold to give", ge=0)
    want_iron: int = Field(default=0, description="Amount of iron to receive", ge=0)
    want_crystal: int = Field(default=0, description="Amount of crystal to receive", ge=0)
    want_gold: int = Field(default=0, description="Amount of gold to receive", ge=0)


class NegotiationObservation(Observation):
    """Observation from the Negotiation environment."""

    player_resources: Dict[str, int] = Field(
        default_factory=lambda: {"iron": 0, "crystal": 0, "gold": 0},
        description="Player's current resources"
    )
    bot_resources: Dict[str, int] = Field(
        default_factory=lambda: {"iron": 0, "crystal": 0, "gold": 0},
        description="Bot's current resources"
    )
    round: int = Field(default=0, description="Current round number")
    total_rounds: int = Field(default=5, description="Total number of trading rounds")
    last_trade_accepted: Optional[bool] = Field(default=None, description="Whether last trade was accepted")
    player_value: int = Field(default=0, description="Current total value of player's resources")
