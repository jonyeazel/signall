# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

"""
Map Environment Implementation.

Grid navigation with fog of war. Agent starts at top-left, goal at bottom-right.
Must navigate efficiently while only seeing adjacent cells.
"""

import random
from collections import deque
from typing import Dict, List, Set, Tuple
from uuid import uuid4

from models import MapAction, MapObservation
from openenv.core.env_server.interfaces import Environment
from openenv.core.env_server.types import State


class MapEnvironment(Environment):
    """
    Grid navigation environment with fog of war.

    8x8 grid with ~18% walls. Agent sees only current cell and adjacent cells.
    Goal is to reach bottom-right corner from top-left efficiently.
    """

    SUPPORTS_CONCURRENT_SESSIONS: bool = True
    GRID_SIZE = 8
    MAX_MOVES = 50
    WALL_DENSITY = 0.18

    DIRECTIONS = {
        "up": (0, -1),
        "down": (0, 1),
        "left": (-1, 0),
        "right": (1, 0),
    }

    def __init__(self):
        """Initialize the map environment."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._grid: List[List[str]] = []
        self._agent_pos: Tuple[int, int] = (0, 0)
        self._goal_pos: Tuple[int, int] = (self.GRID_SIZE - 1, self.GRID_SIZE - 1)
        self._moves: int = 0
        self._reached_goal: bool = False
        self._optimal_path_length: int = 0
        self._revealed: Set[Tuple[int, int]] = set()

    def _generate_grid(self) -> bool:
        """
        Generate a random grid with walls, ensuring a path exists.

        Returns:
            True if valid grid generated, False otherwise.
        """
        self._grid = [["empty" for _ in range(self.GRID_SIZE)] for _ in range(self.GRID_SIZE)]

        num_walls = int(self.GRID_SIZE * self.GRID_SIZE * self.WALL_DENSITY)
        wall_positions = set()

        while len(wall_positions) < num_walls:
            x = random.randint(0, self.GRID_SIZE - 1)
            y = random.randint(0, self.GRID_SIZE - 1)

            if (x, y) == (0, 0) or (x, y) == self._goal_pos:
                continue

            wall_positions.add((x, y))

        for x, y in wall_positions:
            self._grid[y][x] = "wall"

        self._grid[self._goal_pos[1]][self._goal_pos[0]] = "goal"

        path_length = self._bfs_path_length()
        if path_length == -1:
            return False

        self._optimal_path_length = path_length
        return True

    def _bfs_path_length(self) -> int:
        """
        Compute shortest path length using BFS.

        Returns:
            Shortest path length, or -1 if no path exists.
        """
        start = (0, 0)
        queue = deque([(start, 0)])
        visited = {start}

        while queue:
            (x, y), dist = queue.popleft()

            if (x, y) == self._goal_pos:
                return dist

            for dx, dy in self.DIRECTIONS.values():
                nx, ny = x + dx, y + dy

                if 0 <= nx < self.GRID_SIZE and 0 <= ny < self.GRID_SIZE:
                    if (nx, ny) not in visited and self._grid[ny][nx] != "wall":
                        visited.add((nx, ny))
                        queue.append(((nx, ny), dist + 1))

        return -1

    def _get_visible_cells(self) -> List[Dict]:
        """Get cells visible to the agent (current + adjacent)."""
        visible = []
        x, y = self._agent_pos

        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.GRID_SIZE and 0 <= ny < self.GRID_SIZE:
                    cell_type = self._grid[ny][nx]
                    if (nx, ny) == self._agent_pos:
                        cell_type = "agent"
                    visible.append({"x": nx, "y": ny, "type": cell_type})
                    self._revealed.add((nx, ny))

        return visible

    def reset(self) -> MapObservation:
        """Reset the environment and generate a new grid."""
        self._state = State(episode_id=str(uuid4()), step_count=0)
        self._agent_pos = (0, 0)
        self._moves = 0
        self._reached_goal = False
        self._revealed = set()

        while not self._generate_grid():
            pass

        visible_cells = self._get_visible_cells()

        return MapObservation(
            visible_cells=visible_cells,
            position={"x": 0, "y": 0},
            moves=0,
            max_moves=self.MAX_MOVES,
            grid_size=self.GRID_SIZE,
            reached_goal=False,
            done=False,
            reward=0.0,
        )

    def step(self, action: MapAction) -> MapObservation:  # type: ignore[override]
        """
        Execute a move in the specified direction.

        Args:
            action: MapAction with direction to move

        Returns:
            MapObservation with updated state
        """
        self._state.step_count += 1
        self._moves += 1

        direction = action.direction.lower()
        reward = -0.1

        if direction in self.DIRECTIONS:
            dx, dy = self.DIRECTIONS[direction]
            nx, ny = self._agent_pos[0] + dx, self._agent_pos[1] + dy

            if 0 <= nx < self.GRID_SIZE and 0 <= ny < self.GRID_SIZE:
                if self._grid[ny][nx] != "wall":
                    self._agent_pos = (nx, ny)

                    if (nx, ny) == self._goal_pos:
                        self._reached_goal = True
                        reward = 10.0

        visible_cells = self._get_visible_cells()
        done = self._reached_goal or self._moves >= self.MAX_MOVES

        return MapObservation(
            visible_cells=visible_cells,
            position={"x": self._agent_pos[0], "y": self._agent_pos[1]},
            moves=self._moves,
            max_moves=self.MAX_MOVES,
            grid_size=self.GRID_SIZE,
            reached_goal=self._reached_goal,
            done=done,
            reward=reward,
        )

    @property
    def state(self) -> State:
        """Get the current environment state."""
        return self._state
