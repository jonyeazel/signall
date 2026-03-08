# [~] Signall — Cognitive Primitives

> *cognition with rails*

**OpenEnv Agentic Training Platform** — 10 RL environments that isolate the cognitive primitives underlying every economic activity. Train any agent on the building blocks of intelligence. The skills transfer to anything.

Built for the [OpenEnv Hackathon SF](https://cerebralvalley.ai/e/openenv-hackathon-sf) — March 2026.

---

## The Thesis

Every business activity — trading, negotiating, allocating capital, detecting fraud, managing risk — decomposes into a small set of cognitive primitives. Current RL trains agents on final tasks. We train them on the building blocks.

An agent that scores 90%+ across all 10 primitives has the cognitive foundation to operate autonomously in any economic context.

## Line S — Embarcadero to Lands End

| Station | Environment | Cognitive Primitive | Economic Application |
|---|---|---|---|
| Embarcadero | The Bandit | Exploration vs exploitation | Portfolio allocation & market testing |
| Powell St | The Sequence | Pattern recognition | Trend prediction & time series |
| Fog Basin | The Map | Planning under uncertainty | Logistics & route optimization |
| Montgomery | The Auction | Resource allocation | Capital deployment & pricing |
| Civic Center | The Tower | Dependency resolution | Project execution & task sequencing |
| Nob Hill | The Signal | Attention & filtering | Fraud detection & anomaly recognition |
| Market St | The Negotiation | Theory of mind | Deal-making & counterparty modeling |
| Mission | The Repair | Causal reasoning | Root cause analysis & diagnostics |
| Twin Peaks | The Transfer | Analogical reasoning | Market expansion & domain adaptation |
| Lands End | The Meta | Self-assessment | Risk management & confidence calibration |

## What We Built

### 1. Ten OpenEnv-Spec Environments
Each environment conforms to the OpenEnv specification: `reset()`, `step()`, `state()`. FastAPI over WebSocket. Docker-ready. Deployable to HuggingFace Spaces with `openenv push`.

### 2. Interactive Web Platform
A Next.js presentation layer where humans can play each environment and watch AI agents train in real-time. Includes:
- **Play mode** — play any environment manually
- **Watch Agent mode** — observe a specialized AI agent solve each environment
- **Run Full Demo** — auto-sequences through all 10 environments with AI agents
- **Live Training** — real epsilon-greedy learning with live learning curve visualization

### 3. Curriculum Structure
The 10 environments aren't random — they form a structured curriculum: **Foundation** (4 environments) → **Reasoning** (4) → **Mastery** (2). Each phase builds on the cognitive skills trained in the previous phase.

### 4. Real Agent Training
The `/train` page runs a real epsilon-greedy agent through 80 episodes, with:
- Live learning curve (efficiency over episodes)
- Epsilon decay from 1.0 → 0.05
- Agent's learned estimates vs ground truth, updating in real time
- The agent starts knowing nothing and converges on the optimal strategy

## Quick Start

### Web platform
```bash
pnpm install && pnpm dev
# Open http://localhost:3000
```

### Run an environment server
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

### Train an LLM agent (Colab)
The included [`train_llm_agent.ipynb`](train_llm_agent.ipynb) notebook fine-tunes a small LLM to play the Bandit environment using **Unsloth** (LoRA) and **HF TRL** (GRPO). It runs on Colab free tier (T4 GPU) and calls the live HuggingFace Space API for reward signal.

```
Unsloth (Qwen2.5-0.5B + LoRA) → TRL GRPOTrainer → Live OpenEnv API rewards
```

## Live on HuggingFace

All 10 environments are deployed:

- [cognitive-primitives-bandit](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-bandit)
- [cognitive-primitives-sequence](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-sequence)
- [cognitive-primitives-map](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-map)
- [cognitive-primitives-auction](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-auction)
- [cognitive-primitives-tower](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-tower)
- [cognitive-primitives-signal](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-signal)
- [cognitive-primitives-negotiation](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-negotiation)
- [cognitive-primitives-repair](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-repair)
- [cognitive-primitives-transfer](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-transfer)
- [cognitive-primitives-meta](https://huggingface.co/spaces/jonyeazel/cognitive-primitives-meta)

## Architecture

```
signall/
├── app/                    # Next.js web platform
│   ├── page.tsx            # Home — hero, slideshow, journey rail
│   ├── train/page.tsx      # Live training dashboard
│   ├── bandit/page.tsx     # Environment 01
│   ├── sequence/page.tsx   # Environment 02
│   ├── ...                 # Environments 03-10
│   ├── shared.ts           # Palette, env definitions, score management
│   └── shell.tsx           # Layout shell, DemoRail, MetricCard, LessonCard
│
└── openenv-envs/           # OpenEnv Python packages
    ├── bandit_env/
    │   ├── models.py       # Action/Observation Pydantic models
    │   ├── client.py       # WebSocket client (EnvClient)
    │   └── server/
    │       ├── app.py              # FastAPI app (create_app)
    │       ├── *_environment.py    # Environment logic (reset/step/state)
    │       └── Dockerfile          # Docker deployment
    ├── sequence_env/
    ├── ...                 # 10 total environment packages
    └── meta_env/
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Environments**: OpenEnv (Meta/PyTorch), FastAPI, WebSocket, Docker
- **Deployment**: HuggingFace Spaces (10 live endpoints)
- **Design**: Dieter Rams principles — less but better
- **Data**: Procedurally generated — no two runs are identical

## Team

Built by Jon Eazel at the OpenEnv Hackathon SF, March 7-9, 2026.
