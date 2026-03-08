# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Auction Environment Implementation.

Resource allocation with 8 items. Each item has visible appeal and cost,
but hidden true value. Agent must maximize total true value of purchases.
"""

import random
from typing import Dict, List, Tuple
from uuid import uuid4

from models import AuctionAction, AuctionObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class AuctionEnvironment(Environment):
    """
    Auction environment with hidden item values.

    8 items are presented sequentially. Each has:
    - appeal (1-5): visible quality indicator
    - cost: visible price
    - true_value: hidden actual worth

    Agent must decide buy/pass for each. Reward is ratio of
    total_true_value / optimal_true_value.
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True
    TOTAL_ITEMS = 8
    INITIAL_BUDGET = 100

    def __init__(self):
        """Initialize the auction environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._items: List[Dict] = []
        self._current_index: int = 0
        self._budget: int = self.INITIAL_BUDGET
        self._purchased: List[Dict] = []
        self._optimal_value: float = 0.0

    def _generate_items(self):
        """Generate 8 items with appeal, cost, and true_value."""
        self._items = []

        for _ in range(self.TOTAL_ITEMS):
            appeal = random.randint(1, 5)
            base_cost = appeal * random.randint(8, 15)
            cost = max(5, base_cost + random.randint(-10, 10))

            noise = random.gauss(0, appeal * 3)
            true_value = max(1, int(appeal * random.randint(5, 12) + noise))

            self._items.append({
                "appeal": appeal,
                "cost": cost,
                "true_value": true_value,
            })

        self._compute_optimal()

    def _compute_optimal(self):
        """Compute optimal purchase strategy using dynamic programming."""
        n = len(self._items)
        budget = self.INITIAL_BUDGET

        dp = [[0] * (budget + 1) for _ in range(n + 1)]

        for i in range(n - 1, -1, -1):
            item = self._items[i]
            for b in range(budget + 1):
                dp[i][b] = dp[i + 1][b]

                if item["cost"] <= b:
                    buy_value = item["true_value"] + dp[i + 1][b - item["cost"]]
                    dp[i][b] = max(dp[i][b], buy_value)

        self._optimal_value = dp[0][budget]

    def reset(self) -> AuctionObservation:
        """Reset the environment and generate new items."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._generate_items()
        self._current_index = 0
        self._budget = self.INITIAL_BUDGET
        self._purchased = []

        item = self._items[0]

        return AuctionObservation(
            appeal=item["appeal"],
            cost=item["cost"],
            budget_remaining=self._budget,
            item_index=0,
            total_items=self.TOTAL_ITEMS,
            purchased_items=[],
            done=False,
            reward=0.0,
        )

    def step(self, action: AuctionAction) -> AuctionObservation:  # type: ignore[override]
        """
        Execute a buy/pass decision for the current item.

        Args:
            action: AuctionAction with buy decision

        Returns:
            AuctionObservation with next item or final results
        """
        self._state.step_count += 1

        item = self._items[self._current_index]

        if action.buy and item["cost"] <= self._budget:
            self._budget -= item["cost"]
            self._purchased.append({
                "appeal": item["appeal"],
                "cost": item["cost"],
                "true_value": item["true_value"],
                "index": self._current_index,
            })

        self._current_index += 1
        done = self._current_index >= self.TOTAL_ITEMS

        if done:
            total_value = sum(p["true_value"] for p in self._purchased)
            reward = total_value / self._optimal_value if self._optimal_value > 0 else 0.0

            return AuctionObservation(
                appeal=0,
                cost=0,
                budget_remaining=self._budget,
                item_index=self._current_index,
                total_items=self.TOTAL_ITEMS,
                purchased_items=self._purchased,
                done=True,
                reward=reward,
            )

        next_item = self._items[self._current_index]

        return AuctionObservation(
            appeal=next_item["appeal"],
            cost=next_item["cost"],
            budget_remaining=self._budget,
            item_index=self._current_index,
            total_items=self.TOTAL_ITEMS,
            purchased_items=self._purchased,
            done=False,
            reward=0.0,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
