# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Map Environment.

Grid navigation with fog of war. Agent must navigate to goal efficiently.
"""

from typing import Dict, List

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class MapAction(Action):
    """Action for the Map environment - move in a direction."""

    direction: str = Field(..., description="Direction to move: 'up', 'down', 'left', 'right'")


class MapObservation(Observation):
    """Observation from the Map environment."""

    visible_cells: List[Dict] = Field(
        default_factory=list,
        description="List of visible cells, each with {x, y, type}"
    )
    position: Dict = Field(
        default_factory=dict,
        description="Agent's current position {x, y}"
    )
    moves: int = Field(default=0, description="Number of moves taken")
    max_moves: int = Field(default=50, description="Maximum allowed moves")
    grid_size: int = Field(default=8, description="Size of the grid (NxN)")
    reached_goal: bool = Field(default=False, description="Whether agent reached the goal")
