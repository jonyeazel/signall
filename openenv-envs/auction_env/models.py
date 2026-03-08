# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Auction Environment.

Resource allocation: 8 items with hidden values. Agent must decide buy/pass.
"""

from typing import Dict, List

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class AuctionAction(Action):
    """Action for the Auction environment - buy or pass."""

    buy: bool = Field(..., description="True to buy the item, False to pass")


class AuctionObservation(Observation):
    """Observation from the Auction environment."""

    appeal: int = Field(default=0, description="Visual appeal of current item (1-5)")
    cost: int = Field(default=0, description="Cost to purchase current item")
    budget_remaining: int = Field(default=0, description="Remaining budget")
    item_index: int = Field(default=0, description="Current item index (0-7)")
    total_items: int = Field(default=8, description="Total number of items")
    purchased_items: List[Dict] = Field(
        default_factory=list,
        description="List of purchased items with their details"
    )
