# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Sequence Environment Implementation.

Pattern recognition with increasing difficulty. Agent sees 5 numbers and
must predict the 6th based on the underlying rule.
"""

import random
from typing import List, Tuple, Callable
from uuid import uuid4

from models import SequenceAction, SequenceObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class SequenceEnvironment(Environment):
    """
    Sequence prediction environment with 8 rounds of increasing difficulty.

    Rules by round:
    1. Addition (constant difference)
    2. Multiplication (constant ratio)
    3. Alternating (two interleaved sequences)
    4. Squares (n^2)
    5. Fibonacci-like (sum of previous two)
    6. Triangular numbers
    7. Interleaved (two rules combined)
    8. Compound (rule changes at index)
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True
    TOTAL_ROUNDS = 8

    def __init__(self):
        """Initialize the sequence environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._sequences: List[Tuple[List[int], int]] = []
        self._current_round: int = 0
        self._score: int = 0
        self._last_correct: bool | None = None

    def _generate_addition_sequence(self) -> Tuple[List[int], int]:
        """Round 1: Arithmetic sequence with constant difference."""
        start = random.randint(1, 20)
        diff = random.randint(2, 8)
        seq = [start + i * diff for i in range(6)]
        return seq[:5], seq[5]

    def _generate_multiplication_sequence(self) -> Tuple[List[int], int]:
        """Round 2: Geometric sequence with constant ratio."""
        start = random.randint(1, 5)
        ratio = random.randint(2, 3)
        seq = [start * (ratio ** i) for i in range(6)]
        return seq[:5], seq[5]

    def _generate_alternating_sequence(self) -> Tuple[List[int], int]:
        """Round 3: Two interleaved arithmetic sequences."""
        start1 = random.randint(1, 10)
        start2 = random.randint(11, 20)
        diff1 = random.randint(2, 5)
        diff2 = random.randint(2, 5)
        seq = []
        for i in range(6):
            if i % 2 == 0:
                seq.append(start1 + (i // 2) * diff1)
            else:
                seq.append(start2 + (i // 2) * diff2)
        return seq[:5], seq[5]

    def _generate_squares_sequence(self) -> Tuple[List[int], int]:
        """Round 4: Perfect squares."""
        start = random.randint(1, 5)
        seq = [(start + i) ** 2 for i in range(6)]
        return seq[:5], seq[5]

    def _generate_fibonacci_sequence(self) -> Tuple[List[int], int]:
        """Round 5: Fibonacci-like (sum of previous two)."""
        a = random.randint(1, 5)
        b = random.randint(2, 7)
        seq = [a, b]
        for _ in range(4):
            seq.append(seq[-1] + seq[-2])
        return seq[:5], seq[5]

    def _generate_triangular_sequence(self) -> Tuple[List[int], int]:
        """Round 6: Triangular numbers (n*(n+1)/2)."""
        offset = random.randint(0, 3)
        seq = [(n + offset) * (n + offset + 1) // 2 for n in range(1, 7)]
        return seq[:5], seq[5]

    def _generate_interleaved_sequence(self) -> Tuple[List[int], int]:
        """Round 7: Evens are squares, odds are doubles."""
        start_sq = random.randint(1, 4)
        start_dbl = random.randint(2, 8)
        seq = []
        for i in range(6):
            if i % 2 == 0:
                seq.append((start_sq + i // 2) ** 2)
            else:
                seq.append(start_dbl * (2 ** (i // 2)))
        return seq[:5], seq[5]

    def _generate_compound_sequence(self) -> Tuple[List[int], int]:
        """Round 8: First 3 add, last 3 multiply by 2."""
        start = random.randint(2, 6)
        diff = random.randint(2, 4)
        seq = [start, start + diff, start + 2 * diff]
        for i in range(3):
            seq.append(seq[-1] * 2)
        return seq[:5], seq[5]

    def _generate_all_sequences(self):
        """Generate all 8 sequences for the episode."""
        generators = [
            self._generate_addition_sequence,
            self._generate_multiplication_sequence,
            self._generate_alternating_sequence,
            self._generate_squares_sequence,
            self._generate_fibonacci_sequence,
            self._generate_triangular_sequence,
            self._generate_interleaved_sequence,
            self._generate_compound_sequence,
        ]
        self._sequences = [gen() for gen in generators]

    def _generate_choices(self, correct: int) -> List[int]:
        """Generate 4 choices including the correct answer."""
        choices = {correct}
        while len(choices) < 4:
            offset = random.choice([-3, -2, -1, 1, 2, 3])
            wrong = correct + offset * random.randint(1, 5)
            if wrong > 0:
                choices.add(wrong)
        result = list(choices)
        random.shuffle(result)
        return result

    def reset(self) -> SequenceObservation:
        """Reset the environment and generate new sequences."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._generate_all_sequences()
        self._current_round = 0
        self._score = 0
        self._last_correct = None

        seq, correct_answer = self._sequences[0]
        choices = self._generate_choices(correct_answer)

        return SequenceObservation(
            sequence=seq,
            round=1,
            total_rounds=self.TOTAL_ROUNDS,
            correct=None,
            score=0,
            choices=choices,
            done=False,
            reward=0.0,
        )

    def step(self, action: SequenceAction) -> SequenceObservation:  # type: ignore[override]
        """
        Execute a step by checking the agent's answer.

        Args:
            action: SequenceAction with the predicted answer

        Returns:
            SequenceObservation with the next sequence or final results
        """
        self._state.step_count += 1

        _, correct_answer = self._sequences[self._current_round]
        is_correct = action.answer == correct_answer
        reward = 1.0 if is_correct else 0.0

        if is_correct:
            self._score += 1
        self._last_correct = is_correct
        self._current_round += 1

        done = self._current_round >= self.TOTAL_ROUNDS

        if done:
            return SequenceObservation(
                sequence=[],
                round=self._current_round,
                total_rounds=self.TOTAL_ROUNDS,
                correct=is_correct,
                score=self._score,
                choices=[],
                done=True,
                reward=reward,
            )

        next_seq, next_correct = self._sequences[self._current_round]
        choices = self._generate_choices(next_correct)

        return SequenceObservation(
            sequence=next_seq,
            round=self._current_round + 1,
            total_rounds=self.TOTAL_ROUNDS,
            correct=is_correct,
            score=self._score,
            choices=choices,
            done=False,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
