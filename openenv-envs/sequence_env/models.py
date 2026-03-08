# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Sequence Environment.

Pattern recognition: show 5 numbers following a rule, agent predicts the 6th.
"""

from typing import List, Optional

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class SequenceAction(Action):
    """Action for the Sequence environment - predict the next number."""

    answer: int = Field(..., description="The predicted next number in the sequence")


class SequenceObservation(Observation):
    """Observation from the Sequence environment."""

    sequence: List[int] = Field(default_factory=list, description="The 5 visible numbers")
    round: int = Field(default=0, description="Current round number (1-8)")
    total_rounds: int = Field(default=8, description="Total number of rounds")
    correct: Optional[bool] = Field(default=None, description="Whether the last answer was correct")
    score: int = Field(default=0, description="Number of correct answers so far")
    choices: List[int] = Field(default_factory=list, description="4 possible answers including correct one")
