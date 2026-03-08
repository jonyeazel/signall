"""
Bandit Environment Implementation.

Multi-armed bandit with 6 arms. Each arm has a hidden mean reward.
The agent must learn which arm yields the highest expected reward.
Includes a global training log for tracking agent performance.
"""

import random
import time
from uuid import uuid4

from models import BanditAction, BanditObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


# --- Global training log (persists across sessions) ---

class TrainingLog:
    """Tracks all training activity across all agent sessions."""

    def __init__(self):
        self.total_episodes = 0
        self.total_steps = 0
        self.sessions = 0
        self.start_time = time.time()
        self.recent_episodes: list[dict] = []  # last 50 episodes
        self.best_efficiency = 0.0

    def log_episode(self, total_reward: float, steps: int, best_possible: float):
        self.total_episodes += 1
        efficiency = round((total_reward / max(best_possible, 1)) * 100)
        self.best_efficiency = max(self.best_efficiency, efficiency)

        entry = {
            "episode": self.total_episodes,
            "reward": round(total_reward, 1),
            "efficiency": efficiency,
            "steps": steps,
            "timestamp": time.time(),
        }

        self.recent_episodes.append(entry)
        if len(self.recent_episodes) > 50:
            self.recent_episodes = self.recent_episodes[-50:]

    def log_step(self):
        self.total_steps += 1

    def log_session(self):
        self.sessions += 1

    def summary(self) -> dict:
        uptime = time.time() - self.start_time
        recent = self.recent_episodes[-10:] if self.recent_episodes else []
        avg_recent = (
            round(sum(e["efficiency"] for e in recent) / len(recent))
            if recent
            else 0
        )

        return {
            "total_episodes": self.total_episodes,
            "total_steps": self.total_steps,
            "sessions": self.sessions,
            "best_efficiency": self.best_efficiency,
            "avg_recent_efficiency": avg_recent,
            "uptime_seconds": round(uptime),
            "recent_episodes": recent,
        }


# Single global instance
training_log = TrainingLog()


# --- Environment ---

class BanditEnvironment(Environment):
    """
    Multi-armed bandit environment with 6 arms.

    Each arm has a hidden mean reward drawn from a shuffled list of base means.
    Pulling an arm returns a sample from gaussian(mean, variance=2.0).
    Episode ends after 25 steps.
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True

    BASE_MEANS = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9]
    VARIANCE = 2.0
    TOTAL_ROUNDS = 25

    def __init__(self):
        """Initialize the bandit environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._arm_means: list[float] = []
        self._total_score: float = 0.0
        self._last_reward: float = 0.0
        self._last_source_id: int = 0
        training_log.log_session()

    def reset(self) -> BanditObservation:
        """Reset the environment. Shuffles arm means."""
        # Log previous episode if it had steps
        if self._state.step_count > 0:
            best_possible = max(self._arm_means) * self.TOTAL_ROUNDS if self._arm_means else 1
            training_log.log_episode(self._total_score, self._state.step_count, best_possible)

        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._arm_means = self.BASE_MEANS.copy()
        random.shuffle(self._arm_means)
        self._total_score = 0.0
        self._last_reward = 0.0
        self._last_source_id = 0

        return BanditObservation(
            reward=0.0,
            source_id=0,
            round=0,
            total_rounds=self.TOTAL_ROUNDS,
            total_score=0.0,
            done=False,
        )

    def step(self, action: BanditAction) -> BanditObservation:  # type: ignore[override]
        """Execute a step by pulling the selected arm."""
        self._state.step_count += 1
        training_log.log_step()

        arm_id = action.source_id
        mean = self._arm_means[arm_id]
        reward = random.gauss(mean, self.VARIANCE ** 0.5)

        self._total_score += reward
        self._last_reward = reward
        self._last_source_id = arm_id

        done = self._state.step_count >= self.TOTAL_ROUNDS

        # Log episode on completion
        if done:
            best_possible = max(self._arm_means) * self.TOTAL_ROUNDS
            training_log.log_episode(self._total_score, self._state.step_count, best_possible)

        return BanditObservation(
            reward=reward,
            source_id=arm_id,
            round=self._state.step_count,
            total_rounds=self.TOTAL_ROUNDS,
            total_score=self._total_score,
            done=done,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
