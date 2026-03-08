# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Tower Environment.

Dependency resolution: 6 tasks with hidden DAG dependencies.
"""

from typing import List, Optional

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class TowerAction(Action):
    """Action for the Tower environment - attempt a task."""

    task_id: str = Field(..., description="Which task to attempt (A-F)")


class TowerObservation(Observation):
    """Observation from the Tower environment."""

    completed_tasks: List[str] = Field(
        default_factory=list,
        description="List of successfully completed task IDs"
    )
    failed_task: Optional[str] = Field(
        default=None,
        description="The task that failed this turn (if any)"
    )
    revealed_deps: List[str] = Field(
        default_factory=list,
        description="Dependencies revealed when a task failed"
    )
    turn: int = Field(default=0, description="Current turn number")
    max_turns: int = Field(default=12, description="Maximum allowed turns")
    all_complete: bool = Field(default=False, description="Whether all tasks are done")
