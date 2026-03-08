# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Signal Environment.

Signal detection in noise with 30 data points and 4 hidden spikes.
"""

from typing import List

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class SignalAction(Action):
    """Action for the Signal environment."""

    alert: bool = Field(default=False, description="Set to true to predict a spike is coming")
    advance: bool = Field(default=False, description="Set to true to advance to the next value")


class SignalObservation(Observation):
    """Observation from the Signal environment."""

    current_value: float = Field(default=0.0, description="Current data point value")
    position: int = Field(default=0, description="Current position in the sequence (0-29)")
    total_positions: int = Field(default=30, description="Total number of positions")
    alert_active: int = Field(default=0, description="Steps remaining on current alert")
    correct_alerts: int = Field(default=0, description="Number of correctly predicted spikes")
    false_alerts: int = Field(default=0, description="Number of false alerts")
    missed_spikes: int = Field(default=0, description="Number of missed spikes")
    history: List[float] = Field(default_factory=list, description="Last 10 values seen")
