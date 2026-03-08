# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Transfer Environment.

Analogical reasoning. Sort 4 elements in 2 phases.
"""

from typing import List

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class TransferAction(Action):
    """Action for the Transfer environment - swap adjacent elements."""

    swap_index: int = Field(
        ...,
        description="Index (0-2) to swap elements at index and index+1",
        ge=0,
        le=2
    )


class TransferObservation(Observation):
    """Observation from the Transfer environment."""

    current_arrangement: List[str] = Field(
        default_factory=list,
        description="Current arrangement of elements"
    )
    target: List[str] = Field(
        default_factory=list,
        description="Target sorted arrangement"
    )
    phase: int = Field(default=1, description="Current phase (1 or 2)")
    moves: int = Field(default=0, description="Total moves in current phase")
    phase1_moves: int = Field(default=0, description="Moves used in phase 1")
