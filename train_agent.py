"""
Signall — Real Agent Training via OpenEnv API

Connects to a LIVE HuggingFace Space via WebSocket, trains an epsilon-greedy
agent over multiple episodes, and shows the learning curve in real time.

Usage:
    source .venv/bin/activate
    python train_agent.py
"""

import asyncio
import random
from openenv.core import GenericEnvClient

# --- Config ---
SPACE_URL = "https://jonyeazel-cognitive-primitives-bandit.hf.space"
NUM_EPISODES = 30
ROUNDS_PER_EPISODE = 25
NUM_ARMS = 6
EPSILON_START = 1.0
EPSILON_END = 0.05
EPSILON_DECAY = 0.06


async def main():
    print()
    print("  Signall — Real Agent Training")
    print(f"  Target: {SPACE_URL}")
    print(f"  Protocol: OpenEnv WebSocket")
    print(f"  Episodes: {NUM_EPISODES} x {ROUNDS_PER_EPISODE} rounds")
    print()

    # Agent state persists across episodes
    estimates = [0.0] * NUM_ARMS
    pull_counts = [0] * NUM_ARMS
    total_rewards_per_arm = [0.0] * NUM_ARMS
    epsilon = EPSILON_START

    results = []

    async with GenericEnvClient(base_url=SPACE_URL) as client:
        print("  Connected to HuggingFace Space via WebSocket")
        print()

        for episode in range(NUM_EPISODES):
            # Reset environment
            await client.reset()

            total_reward = 0.0

            for _ in range(ROUNDS_PER_EPISODE):
                # Epsilon-greedy
                if random.random() < epsilon:
                    action = random.randint(0, NUM_ARMS - 1)
                else:
                    action = max(range(NUM_ARMS), key=lambda i: estimates[i])

                # Step via real API
                result = await client.step({"source_id": action})
                reward = result.reward

                total_reward += reward

                # Update estimates
                pull_counts[action] += 1
                total_rewards_per_arm[action] += reward
                estimates[action] = total_rewards_per_arm[action] / pull_counts[action]

            # Decay epsilon
            epsilon = max(EPSILON_END, epsilon - EPSILON_DECAY)

            # Efficiency
            best_mean = max(estimates) if any(e > 0 for e in estimates) else 1
            optimal = best_mean * ROUNDS_PER_EPISODE
            efficiency = min(100, round((total_reward / max(optimal, 1)) * 100))

            results.append(efficiency)

            # Progress bar
            bar = "█" * (efficiency * 30 // 100) + "░" * (30 - efficiency * 30 // 100)
            print(f"  {episode + 1:2d}/{NUM_EPISODES}  [{bar}] {efficiency:3d}%  ε={epsilon:.2f}  reward={total_reward:.0f}")

    # Summary
    print()
    first_5 = sum(results[:5]) / 5
    last_5 = sum(results[-5:]) / 5
    best = max(results)

    print(f"  First 5 avg:  {first_5:.0f}%")
    print(f"  Last 5 avg:   {last_5:.0f}%")
    print(f"  Best episode: {best}%")
    print(f"  Improvement:  {last_5 - first_5:+.0f}%")
    print(f"  Total pulls:  {sum(pull_counts)}")
    print()
    print("  Learned estimates:")
    best_arm = max(range(NUM_ARMS), key=lambda i: estimates[i])
    for i in range(NUM_ARMS):
        bar = "█" * int(estimates[i] / 10 * 20) if estimates[i] > 0 else ""
        tag = " ← best" if i == best_arm else ""
        print(f"    Arm {i}: {estimates[i]:5.2f}  {bar}{tag}")
    print()
    print("  Every step was a real WebSocket message to HuggingFace.")
    print()


if __name__ == "__main__":
    asyncio.run(main())
