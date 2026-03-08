# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Negotiation Environment Implementation.

Trading with a hidden-strategy bot. The bot has hidden resource values and
uses one of four strategies: fair, greedy, generous, or mirror.
"""

import random
from uuid import uuid4

from models import NegotiationAction, NegotiationObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class NegotiationEnvironment(Environment):
    """
    Negotiation environment with a hidden-strategy trading bot.

    Player starts with iron=5, crystal=3, gold=2.
    Bot starts with iron=2, crystal=5, gold=4.
    Player values: iron=1, crystal=3, gold=5.
    Bot gets random hidden values and a random strategy.

    Strategies:
    - fair: accepts if both sides gain similar value
    - greedy: only accepts if bot gains more than player
    - generous: accepts if bot gains anything
    - mirror: mirrors player's trading pattern

    Final reward: player_value / theoretical_max_value
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    TOTAL_ROUNDS = 5
    PLAYER_VALUES = {"iron": 1, "crystal": 3, "gold": 5}

    def __init__(self):
        """Initialize the negotiation environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._player_resources: dict[str, int] = {}
        self._bot_resources: dict[str, int] = {}
        self._bot_values: dict[str, int] = {}
        self._bot_strategy: str = ""
        self._round: int = 0
        self._last_trade_accepted: bool | None = None
        self._last_player_give: dict[str, int] = {}

    def _calculate_player_value(self) -> int:
        """Calculate total value of player's resources."""
        return sum(
            self._player_resources[r] * self.PLAYER_VALUES[r]
            for r in ["iron", "crystal", "gold"]
        )

    def _calculate_theoretical_max(self) -> int:
        """Calculate theoretical maximum value if player had all resources."""
        total_iron = 5 + 2  # player + bot starting
        total_crystal = 3 + 5
        total_gold = 2 + 4
        return (
            total_iron * self.PLAYER_VALUES["iron"] +
            total_crystal * self.PLAYER_VALUES["crystal"] +
            total_gold * self.PLAYER_VALUES["gold"]
        )

    def _bot_evaluates_trade(
        self,
        player_gives: dict[str, int],
        player_wants: dict[str, int]
    ) -> bool:
        """Evaluate if bot accepts the trade based on its strategy."""
        # Check if trade is valid (player has resources, bot has resources)
        for r in ["iron", "crystal", "gold"]:
            if player_gives[r] > self._player_resources[r]:
                return False
            if player_wants[r] > self._bot_resources[r]:
                return False

        # Calculate value changes
        bot_gains = sum(player_gives[r] * self._bot_values[r] for r in ["iron", "crystal", "gold"])
        bot_loses = sum(player_wants[r] * self._bot_values[r] for r in ["iron", "crystal", "gold"])
        bot_net = bot_gains - bot_loses

        player_gains = sum(player_wants[r] * self.PLAYER_VALUES[r] for r in ["iron", "crystal", "gold"])
        player_loses = sum(player_gives[r] * self.PLAYER_VALUES[r] for r in ["iron", "crystal", "gold"])
        player_net = player_gains - player_loses

        if self._bot_strategy == "fair":
            # Accept if difference in gains is small
            return abs(bot_net - player_net) <= 2 and bot_net >= 0

        elif self._bot_strategy == "greedy":
            # Only accept if bot gains more than player
            return bot_net > player_net and bot_net > 0

        elif self._bot_strategy == "generous":
            # Accept if bot gains anything
            return bot_net > 0

        elif self._bot_strategy == "mirror":
            # Mirror: accept trades similar to what player previously offered
            if not self._last_player_give:
                return bot_net >= 0
            # Compare ratios
            total_give = sum(player_gives.values())
            total_want = sum(player_wants.values())
            if total_give == 0 or total_want == 0:
                return False
            ratio = total_give / total_want
            return 0.5 <= ratio <= 2.0 and bot_net >= -1

        return False

    def reset(self) -> NegotiationObservation:
        """
        Reset the environment.

        Sets up initial resources and randomly assigns bot values and strategy.
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)

        # Initialize resources
        self._player_resources = {"iron": 5, "crystal": 3, "gold": 2}
        self._bot_resources = {"iron": 2, "crystal": 5, "gold": 4}

        # Random bot values (1-5 for each resource)
        self._bot_values = {
            "iron": random.randint(1, 5),
            "crystal": random.randint(1, 5),
            "gold": random.randint(1, 5),
        }

        # Random strategy
        self._bot_strategy = random.choice(["fair", "greedy", "generous", "mirror"])

        self._round = 0
        self._last_trade_accepted = None
        self._last_player_give = {}

        return NegotiationObservation(
            player_resources=self._player_resources.copy(),
            bot_resources=self._bot_resources.copy(),
            round=0,
            total_rounds=self.TOTAL_ROUNDS,
            last_trade_accepted=None,
            player_value=self._calculate_player_value(),
            done=False,
        )

    def step(self, action: NegotiationAction) -> NegotiationObservation:
        """
        Execute a trading step.

        Args:
            action: NegotiationAction with trade proposal

        Returns:
            NegotiationObservation with trade result
        """
        self._state.step_count += 1
        self._round += 1

        player_gives = {
            "iron": action.give_iron,
            "crystal": action.give_crystal,
            "gold": action.give_gold,
        }
        player_wants = {
            "iron": action.want_iron,
            "crystal": action.want_crystal,
            "gold": action.want_gold,
        }

        # Evaluate trade
        accepted = self._bot_evaluates_trade(player_gives, player_wants)
        self._last_trade_accepted = accepted

        if accepted:
            # Execute trade
            for r in ["iron", "crystal", "gold"]:
                self._player_resources[r] -= player_gives[r]
                self._player_resources[r] += player_wants[r]
                self._bot_resources[r] += player_gives[r]
                self._bot_resources[r] -= player_wants[r]

        # Store for mirror strategy
        self._last_player_give = player_gives.copy()

        done = self._round >= self.TOTAL_ROUNDS

        # Calculate reward at end
        reward = 0.0
        if done:
            reward = self._calculate_player_value() / self._calculate_theoretical_max()

        return NegotiationObservation(
            player_resources=self._player_resources.copy(),
            bot_resources=self._bot_resources.copy(),
            round=self._round,
            total_rounds=self.TOTAL_ROUNDS,
            last_trade_accepted=accepted,
            player_value=self._calculate_player_value(),
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
