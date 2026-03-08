# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Signal Environment Implementation.

Signal detection in noise. 30 data points with 4 hidden spikes preceded by tells.
Agent must predict spikes by alerting when they see the tell pattern.
"""

import random
from uuid import uuid4

from models import SignalAction, SignalObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class SignalEnvironment(Environment):
    """
    Signal detection environment.

    30 data points with noise (values 1-5). 4 spikes (values 8-10) are hidden
    at random positions. Each spike is preceded by a "tell" (value ending in .5)
    exactly 2 positions before.

    The agent can:
    - Set an alert to predict a spike is coming
    - Advance to see the next value

    Scoring:
    - Correct alert (spike within 2 positions): +25 points
    - False alert (no spike): -10 points
    - Missed spike (no active alert): tracked but no immediate penalty

    Final reward: (correct*25 - false*10) / 100
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    TOTAL_POSITIONS = 30
    NUM_SPIKES = 4
    ALERT_DURATION = 2

    def __init__(self):
        """Initialize the signal environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._values: list[float] = []
        self._spike_positions: set[int] = set()
        self._position: int = 0
        self._alert_remaining: int = 0
        self._correct_alerts: int = 0
        self._false_alerts: int = 0
        self._missed_spikes: int = 0
        self._history: list[float] = []
        self._alerted_spikes: set[int] = set()

    def reset(self) -> SignalObservation:
        """
        Reset the environment.

        Generate 30 values with noise (1-5), place 4 spikes (8-10),
        and place tells (X.5) 2 positions before each spike.
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)

        # Generate base noise values (1-5, no decimals ending in .5)
        self._values = []
        for _ in range(self.TOTAL_POSITIONS):
            val = random.uniform(1.0, 5.0)
            # Ensure no accidental .5 endings
            if abs(val - round(val * 2) / 2) < 0.1:
                val = round(val) + 0.2
            self._values.append(round(val, 2))

        # Place 4 spikes at random positions (must have room for tell 2 positions before)
        available_positions = list(range(2, self.TOTAL_POSITIONS))
        self._spike_positions = set(random.sample(available_positions, self.NUM_SPIKES))

        # Place spikes (8-10) and tells (X.5) 2 positions before
        for spike_pos in self._spike_positions:
            self._values[spike_pos] = round(random.uniform(8.0, 10.0), 2)
            tell_pos = spike_pos - 2
            # Tell is a value ending in .5
            base = random.randint(2, 4)
            self._values[tell_pos] = base + 0.5

        self._position = 0
        self._alert_remaining = 0
        self._correct_alerts = 0
        self._false_alerts = 0
        self._missed_spikes = 0
        self._history = []
        self._alerted_spikes = set()

        return SignalObservation(
            current_value=self._values[0],
            position=0,
            total_positions=self.TOTAL_POSITIONS,
            alert_active=0,
            correct_alerts=0,
            false_alerts=0,
            missed_spikes=0,
            history=[],
            done=False,
        )

    def step(self, action: SignalAction) -> SignalObservation:
        """
        Execute a step.

        Args:
            action: SignalAction with alert and/or advance flags

        Returns:
            SignalObservation with current state
        """
        self._state.step_count += 1

        # Process alert action
        if action.alert and self._alert_remaining == 0:
            self._alert_remaining = self.ALERT_DURATION

        # Process advance action
        if action.advance and self._position < self.TOTAL_POSITIONS - 1:
            # Check if current position was a spike
            if self._position in self._spike_positions:
                if self._alert_remaining > 0 and self._position not in self._alerted_spikes:
                    self._correct_alerts += 1
                    self._alerted_spikes.add(self._position)
                elif self._position not in self._alerted_spikes:
                    self._missed_spikes += 1

            # Add to history before advancing
            self._history.append(self._values[self._position])
            if len(self._history) > 10:
                self._history = self._history[-10:]

            # Advance position
            self._position += 1

            # Decrement alert if active
            if self._alert_remaining > 0:
                self._alert_remaining -= 1
                # Check for false alert when alert expires
                if self._alert_remaining == 0:
                    # Check if any spike was caught during this alert
                    alert_start_pos = self._position - self.ALERT_DURATION
                    found_spike = False
                    for pos in range(max(0, alert_start_pos), self._position):
                        if pos in self._spike_positions:
                            found_spike = True
                            break
                    if not found_spike:
                        self._false_alerts += 1

        done = self._position >= self.TOTAL_POSITIONS - 1

        # Final check for the last position
        if done and self._position in self._spike_positions:
            if self._alert_remaining > 0 and self._position not in self._alerted_spikes:
                self._correct_alerts += 1
                self._alerted_spikes.add(self._position)
            elif self._position not in self._alerted_spikes:
                self._missed_spikes += 1

        # Calculate reward at end
        reward = 0.0
        if done:
            reward = (self._correct_alerts * 25 - self._false_alerts * 10) / 100.0

        return SignalObservation(
            current_value=self._values[self._position],
            position=self._position,
            total_positions=self.TOTAL_POSITIONS,
            alert_active=self._alert_remaining,
            correct_alerts=self._correct_alerts,
            false_alerts=self._false_alerts,
            missed_spikes=self._missed_spikes,
            history=self._history.copy(),
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
