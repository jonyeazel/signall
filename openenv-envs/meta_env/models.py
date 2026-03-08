# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Meta Environment.

Metacognition. Answer questions with confidence predictions.
"""

from typing import List, Optional

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class MetaAction(Action):
    """Action for the Meta environment - answer with confidence."""

    confidence: int = Field(
        ...,
        description="Confidence level (25, 50, 75, or 100)"
    )
    answer: int = Field(
        ...,
        description="Answer index (0-3)",
        ge=0,
        le=3
    )


class MetaObservation(Observation):
    """Observation from the Meta environment."""

    question: str = Field(default="", description="Current question")
    options: List[str] = Field(default_factory=list, description="Answer options (4 choices)")
    round: int = Field(default=0, description="Current round (1-8)")
    total_rounds: int = Field(default=8, description="Total number of rounds")
    last_correct: Optional[bool] = Field(default=None, description="Was last answer correct")
    last_points: Optional[int] = Field(default=None, description="Points from last answer")
    total_points: int = Field(default=0, description="Cumulative points")
