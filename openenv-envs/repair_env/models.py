# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Data models for the Repair Environment.

Pipeline debugging. 6 components in series, one broken.
"""

from typing import Dict, Optional

from openenv.core.env_server.types import Action, Observation
from pydantic import Field


class RepairAction(Action):
    """Action for the Repair environment - test or identify a component."""

    action_type: str = Field(..., description="Action type: 'test' or 'identify'")
    component: int = Field(..., description="Component index (0-5)", ge=0, le=5)


class RepairObservation(Observation):
    """Observation from the Repair environment."""

    test_results: Dict[int, str] = Field(
        default_factory=dict,
        description="Test results per component: 'pass', 'fail', or 'untested'"
    )
    tests_used: int = Field(default=0, description="Number of tests performed")
    max_tests: int = Field(default=6, description="Maximum allowed tests")
    identified: bool = Field(default=False, description="Whether identification was attempted")
    correct: Optional[bool] = Field(default=None, description="Whether identification was correct")
