# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""Signal Environment Client."""

from typing import Dict

from openenv.core import EnvClient
from openenv.core.client_types import StepResult
from openenv.core.env_server.types import State

from .models import SignalAction, SignalObservation


class SignalEnv(EnvClient[SignalAction, SignalObservation]):
    """
    Client for the Signal Environment.

    Signal detection in noise. Predict spikes by alerting when you see tells.
    """

    def _step_payload(self, action: SignalAction) -> Dict:
        """Convert SignalAction to JSON payload for step message."""
        return {
            "alert": action.alert,
            "advance": action.advance,
        }

    def _parse_result(self, payload: Dict) -> StepResult[SignalObservation]:
        """Parse server response into StepResult[SignalObservation]."""
        obs_data = payload.get("observation", {})
        observation = SignalObservation(
            current_value=obs_data.get("current_value", 0.0),
            position=obs_data.get("position", 0),
            total_positions=obs_data.get("total_positions", 30),
            alert_active=obs_data.get("alert_active", 0),
            correct_alerts=obs_data.get("correct_alerts", 0),
            false_alerts=obs_data.get("false_alerts", 0),
            missed_spikes=obs_data.get("missed_spikes", 0),
            history=obs_data.get("history", []),
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
