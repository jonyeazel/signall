# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Bandit Environment.

Multi-armed bandit with 6 arms, each with hidden mean rewards.
"""

from typing import List

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class BanditAction(Action):
    """Action for the Bandit environment - select which arm to pull."""

    source_id: int = Field(..., description="Which arm to pull (0-5)", ge=0, le=5)


class BanditObservation(Observation):
    """Observation from the Bandit environment."""

    reward: float = Field(default=0.0, description="The reward from the last pull")
    source_id: int = Field(default=0, description="Which arm was pulled")
    round: int = Field(default=0, description="Current round number")
    total_rounds: int = Field(default=25, description="Total number of rounds")
    total_score: float = Field(default=0.0, description="Cumulative score so far")
