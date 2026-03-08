# Cognitive Primitives — OpenEnv Training Platform

General intelligence isn't one skill. It's the composition of fundamental cognitive capabilities. This platform isolates 10 of them into standalone RL environments, each conforming to the OpenEnv spec.

Train any agent on these primitives. An agent that masters all 10 can perform well on arbitrary novel tasks — because every complex task decomposes into some combination of these capabilities.

## The Curriculum

### Foundation
| # | Environment | Capability | What it trains |
|---|---|---|---|
| 01 | **The Bandit** | Exploration vs exploitation | When to gather information vs act on it |
| 02 | **The Sequence** | Pattern recognition | Extracting structure from observations |
| 03 | **The Map** | Planning under uncertainty | Navigating with incomplete information |
| 04 | **The Auction** | Resource allocation | Prioritizing under scarcity |

### Reasoning
| # | Environment | Capability | What it trains |
|---|---|---|---|
| 05 | **The Tower** | Dependency resolution | Inferring structure from failures |
| 06 | **The Signal** | Attention & filtering | Ignoring noise, focusing on what matters |
| 07 | **The Negotiation** | Theory of mind | Modeling other agents' hidden strategies |
| 08 | **The Repair** | Causal reasoning | Reasoning backwards from effects to causes |

### Mastery
| # | Environment | Capability | What it trains |
|---|---|---|---|
| 09 | **The Transfer** | Analogical reasoning | Applying known structure to new domains |
| 10 | **The Meta** | Self-assessment | Knowing what you know and what you don't |

## Architecture

**Web platform** — Interactive Next.js app where humans or agents play each environment. Intro → Play → Reveal with post-game analysis and lesson cards.

**OpenEnv Python API** — Each environment is a standalone OpenEnv package with `reset()`, `step()`, `state()`. FastAPI server over WebSocket. Docker-ready. Deployable to HuggingFace Spaces.

**Agent demo** — Built-in epsilon-greedy agent that trains in real-time on The Bandit, visible in the web UI. Watch an AI learn exploration-exploitation in 15 seconds.

## Quick Start

### Web platform
```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

### OpenEnv environments
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install git+https://github.com/meta-pytorch/OpenEnv
cd openenv-envs/bandit_env
uvicorn server.app:app --port 8000
```

### Connect an agent
```python
from bandit_env import BanditEnv, BanditAction

async with BanditEnv(base_url="http://localhost:8000") as client:
    result = await client.reset()
    for _ in range(25):
        result = await client.step(BanditAction(source_id=best_arm))
```

## Live on HuggingFace

All 10 environments are deployed and running:

| # | Environment | Space |
|---|---|---|
| 01 | The Bandit | [cognitive-primitives-bandit](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-bandit) |
| 02 | The Sequence | [cognitive-primitives-sequence](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-sequence) |
| 03 | The Map | [cognitive-primitives-map](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-map) |
| 04 | The Auction | [cognitive-primitives-auction](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-auction) |
| 05 | The Tower | [cognitive-primitives-tower](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-tower) |
| 06 | The Signal | [cognitive-primitives-signal](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-signal) |
| 07 | The Negotiation | [cognitive-primitives-negotiation](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-negotiation) |
| 08 | The Repair | [cognitive-primitives-repair](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-repair) |
| 09 | The Transfer | [cognitive-primitives-transfer](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-transfer) |
| 10 | The Meta | [cognitive-primitives-meta](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-meta) |

## Why cognitive primitives?

Current RL training is task-specific. An agent trained on Wordle can't play Sudoku. An agent trained on web browsing can't debug code.

But all these tasks share underlying cognitive requirements: pattern recognition, causal reasoning, resource allocation, theory of mind. If you train on the primitives instead of the tasks, the skills transfer.

This is how humans learn. We don't memorize every possible situation — we develop general capabilities (attention, planning, inference) that compose into performance on any novel task. This platform brings that same approach to agent training.

## Tech stack
- Next.js 16 + React 19 + Tailwind CSS 4
- OpenEnv (Meta/PyTorch) for environment spec
- FastAPI + WebSocket for environment servers
- Procedural generation — no two runs are identical
