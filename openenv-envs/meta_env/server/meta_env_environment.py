# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Meta Environment Implementation.

Metacognition. Answer questions with confidence predictions.
Tests the agent's ability to calibrate confidence with accuracy.
"""

import random
from uuid import uuid4

from models import MetaAction, MetaObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class MetaEnvironment(Environment):
    """
    Metacognition environment.

    8 quiz scenarios covering pattern, causation, probability, strategy, etc.
    Agent must answer and predict confidence (25, 50, 75, or 100).

    Scoring:
    - Correct answer: +confidence points
    - Wrong answer: -confidence/2 points

    Final reward: total_points / 800 (perfect = all correct at 100% confidence)
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    TOTAL_ROUNDS = 8
    MAX_POINTS = 800  # 8 rounds * 100 confidence

    # Quiz scenarios with varying difficulty
    QUIZ_BANK = [
        {
            "type": "pattern",
            "question": "What comes next in the sequence: 2, 6, 12, 20, ?",
            "options": ["28", "30", "32", "36"],
            "correct": 1,  # 30 (difference increases by 2 each time: 4, 6, 8, 10)
        },
        {
            "type": "causation",
            "question": "A study finds cities with more ice cream sales have higher crime rates. This likely means:",
            "options": [
                "Ice cream causes crime",
                "Crime causes ice cream sales",
                "A third factor (like heat) affects both",
                "The correlation is coincidental"
            ],
            "correct": 2,
        },
        {
            "type": "probability",
            "question": "You flip a fair coin 5 times and get heads each time. What's the probability of heads on the 6th flip?",
            "options": ["Less than 50%", "Exactly 50%", "More than 50%", "Depends on previous flips"],
            "correct": 1,
        },
        {
            "type": "strategy",
            "question": "In a game where you can cooperate or defect, your opponent will copy your last move. Best long-term strategy?",
            "options": ["Always defect", "Always cooperate", "Alternate", "Random"],
            "correct": 1,
        },
        {
            "type": "logic",
            "question": "All roses are flowers. Some flowers fade quickly. Therefore:",
            "options": [
                "All roses fade quickly",
                "Some roses fade quickly",
                "No roses fade quickly",
                "Cannot be determined"
            ],
            "correct": 3,
        },
        {
            "type": "estimation",
            "question": "Approximately how many piano tuners are in a city of 1 million people?",
            "options": ["About 10", "About 100", "About 1,000", "About 10,000"],
            "correct": 1,  # ~100 (rough Fermi estimate)
        },
        {
            "type": "inversion",
            "question": "If all squares are rectangles, what can we conclude?",
            "options": [
                "All rectangles are squares",
                "Some rectangles are not squares",
                "No rectangles are squares",
                "Cannot be determined from this alone"
            ],
            "correct": 3,
        },
        {
            "type": "base_rate",
            "question": "A disease affects 1% of population. A test is 90% accurate. If you test positive, what's your approximate chance of having the disease?",
            "options": ["About 90%", "About 50%", "About 10%", "About 1%"],
            "correct": 2,  # ~9% (base rate neglect)
        },
    ]

    def __init__(self):
        """Initialize the meta environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._questions: list[dict] = []
        self._round: int = 0
        self._total_points: int = 0
        self._last_correct: bool | None = None
        self._last_points: int | None = None

    def reset(self) -> MetaObservation:
        """
        Reset the environment.

        Shuffle and select 8 quiz scenarios.
        """
        self._state = State(episode_id=str(uuid4()), step_count=0)

        # Shuffle questions
        self._questions = self.QUIZ_BANK.copy()
        random.shuffle(self._questions)

        self._round = 0
        self._total_points = 0
        self._last_correct = None
        self._last_points = None

        # Return first question
        first_q = self._questions[0]
        return MetaObservation(
            question=first_q["question"],
            options=first_q["options"],
            round=1,
            total_rounds=self.TOTAL_ROUNDS,
            last_correct=None,
            last_points=None,
            total_points=0,
            done=False,
        )

    def step(self, action: MetaAction) -> MetaObservation:
        """
        Execute an answer.

        Args:
            action: MetaAction with confidence (25/50/75/100) and answer (0-3)

        Returns:
            MetaObservation with result and next question
        """
        self._state.step_count += 1

        # Validate confidence
        confidence = action.confidence
        if confidence not in [25, 50, 75, 100]:
            confidence = 25  # Default to lowest if invalid

        # Check answer
        current_q = self._questions[self._round]
        correct = action.answer == current_q["correct"]
        self._last_correct = correct

        # Calculate points
        if correct:
            points = confidence
        else:
            points = -confidence // 2

        self._last_points = points
        self._total_points += points
        self._round += 1

        done = self._round >= self.TOTAL_ROUNDS

        # Calculate reward at end
        reward = 0.0
        if done:
            reward = max(0, self._total_points) / self.MAX_POINTS

        # Prepare next question or final state
        if done:
            return MetaObservation(
                question="",
                options=[],
                round=self._round,
                total_rounds=self.TOTAL_ROUNDS,
                last_correct=correct,
                last_points=points,
                total_points=self._total_points,
                done=True,
                reward=reward,
            )
        else:
            next_q = self._questions[self._round]
            return MetaObservation(
                question=next_q["question"],
                options=next_q["options"],
                round=self._round + 1,
                total_rounds=self.TOTAL_ROUNDS,
                last_correct=correct,
                last_points=points,
                total_points=self._total_points,
                done=False,
            )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
