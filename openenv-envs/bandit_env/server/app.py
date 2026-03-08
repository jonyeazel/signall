"""
FastAPI application for the Bandit Environment.

Endpoints:
    - POST /reset: Reset the environment
    - POST /step: Execute an action
    - GET /state: Get current environment state
    - GET /schema: Get action/observation schemas
    - POST /mcp: MCP JSON-RPC endpoint (tools/list, tools/call)
    - GET /training-log: View training activity
    - WS /ws: WebSocket endpoint for persistent sessions
"""

import json
from typing import Any, Dict

try:
    from openenv.core.env_server.http_server import create_app
except Exception as e:
    raise ImportError(
        "openenv is required. Install with: uv sync"
    ) from e

from fastapi import Request
from fastapi.responses import HTMLResponse

from models import BanditAction, BanditObservation
from .bandit_env_environment import BanditEnvironment, training_log


# Create the OpenEnv app
app = create_app(
    BanditEnvironment,
    BanditAction,
    BanditObservation,
    env_name="bandit_env",
    max_concurrent_envs=5,
)

# --- MCP endpoint (JSON-RPC 2.0) ---
# Remove any existing /mcp route from the framework (may return "not supported")
# then register our own that actually works. Ensures openenv validate 6/6.
app.routes[:] = [r for r in app.routes if not (hasattr(r, 'path') and r.path == '/mcp')]

@app.post("/mcp")
async def mcp_endpoint(request: Request) -> Dict[str, Any]:
    """
    MCP JSON-RPC 2.0 endpoint.

    Supports:
    - tools/list: List available environment tools
    - tools/call: Call a tool (pull_arm, get_state)
    """
    try:
        body = await request.body()
        data = json.loads(body)
    except (json.JSONDecodeError, Exception):
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32700, "message": "Parse error"},
            "id": None,
        }

    method = data.get("method", "")
    params = data.get("params", {})
    request_id = data.get("id", 1)

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "result": {
                "tools": [
                    {
                        "name": "pull_arm",
                        "description": "Pull one of 6 bandit arms (0-5) and receive a reward",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "source_id": {
                                    "type": "integer",
                                    "description": "Which arm to pull (0-5)",
                                    "minimum": 0,
                                    "maximum": 5,
                                }
                            },
                            "required": ["source_id"],
                        },
                    },
                    {
                        "name": "reset",
                        "description": "Reset the environment and start a new episode",
                        "inputSchema": {"type": "object", "properties": {}},
                    },
                    {
                        "name": "get_state",
                        "description": "Get the current environment state",
                        "inputSchema": {"type": "object", "properties": {}},
                    },
                ]
            },
            "id": request_id,
        }

    elif method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        env = BanditEnvironment()

        if tool_name == "reset":
            obs = env.reset()
            return {
                "jsonrpc": "2.0",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({
                                "source_id": obs.source_id,
                                "round": obs.round,
                                "total_rounds": obs.total_rounds,
                                "total_score": obs.total_score,
                            }),
                        }
                    ]
                },
                "id": request_id,
            }

        elif tool_name == "pull_arm":
            env.reset()  # Ensure initialized
            source_id = arguments.get("source_id", 0)
            action = BanditAction(source_id=source_id)
            obs = env.step(action)
            return {
                "jsonrpc": "2.0",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({
                                "reward": round(obs.reward, 2),
                                "source_id": obs.source_id,
                                "round": obs.round,
                                "total_score": round(obs.total_score, 2),
                                "done": obs.done,
                            }),
                        }
                    ]
                },
                "id": request_id,
            }

        elif tool_name == "get_state":
            return {
                "jsonrpc": "2.0",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps({
                                "episode_id": str(env.state.episode_id),
                                "step_count": env.state.step_count,
                            }),
                        }
                    ]
                },
                "id": request_id,
            }

        else:
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32601,
                    "message": f"Tool not found: {tool_name}",
                },
                "id": request_id,
            }

    else:
        return {
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": f"Method not found: {method}"},
            "id": request_id,
        }


# --- Training log endpoint ---

@app.get("/training-log")
def get_training_log():
    """Return training activity as JSON."""
    return training_log.summary()


@app.get("/training-dashboard", response_class=HTMLResponse)
def training_dashboard():
    """Visual dashboard showing training activity."""
    data = training_log.summary()
    episodes = data["recent_episodes"]

    # Build learning curve SVG
    if episodes:
        points = []
        w, h = 600, 120
        for i, ep in enumerate(episodes):
            x = 40 + (i / max(len(episodes) - 1, 1)) * (w - 60)
            y = 10 + (1 - ep["efficiency"] / 100) * (h - 20)
            points.append(f"{x},{y}")
        polyline = f'<polyline points="{" ".join(points)}" fill="none" stroke="#E05A00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'

        grid = ""
        for pct in [0, 25, 50, 75, 100]:
            y = 10 + (1 - pct / 100) * (h - 20)
            grid += f'<line x1="40" y1="{y}" x2="{w}" y2="{y}" stroke="#2A2A2E" stroke-width="0.5"/>'
            grid += f'<text x="35" y="{y + 3}" text-anchor="end" fill="#5A5A58" font-size="9">{pct}</text>'

        chart = f'<svg viewBox="0 0 {w} {h}" style="width:100%;height:auto">{grid}{polyline}</svg>'
    else:
        chart = '<div style="padding:40px;text-align:center;color:#5A5A58;font-size:13px">No training data yet. Run train_agent.py to start.</div>'

    rows = ""
    for ep in reversed(episodes[-10:]):
        bar_w = ep["efficiency"] * 2
        rows += f'''
        <tr>
            <td style="padding:6px 12px;color:#9A9A96;font-size:12px">{ep["episode"]}</td>
            <td style="padding:6px 12px">
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:{bar_w}px;height:6px;background:#E05A00;border-radius:3px"></div>
                    <span style="color:#E8E8E3;font-size:13px;font-weight:500">{ep["efficiency"]}%</span>
                </div>
            </td>
            <td style="padding:6px 12px;color:#9A9A96;font-size:12px">{ep["reward"]}</td>
        </tr>'''

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Signall Training Log</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ background: #0E0E10; color: #E8E8E3; font-family: -apple-system, system-ui, sans-serif; padding: 32px; }}
        .container {{ max-width: 700px; margin: 0 auto; }}
        .header {{ display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }}
        .logo {{ font-size: 17px; font-weight: 700; color: #E05A00; }}
        .title {{ font-size: 14px; font-weight: 600; }}
        .subtitle {{ font-size: 10px; color: #5A5A58; letter-spacing: 0.04em; }}
        .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }}
        .stat {{ background: #1C1C1F; border: 1px solid #2A2A2E; border-radius: 12px; padding: 16px; }}
        .stat-label {{ font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5A5A58; margin-bottom: 8px; }}
        .stat-value {{ font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }}
        .accent {{ color: #E05A00; }}
        .chart-card {{ background: #1C1C1F; border: 1px solid #2A2A2E; border-radius: 12px; padding: 20px; margin-bottom: 24px; }}
        .section-label {{ font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5A5A58; margin-bottom: 12px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        tr {{ border-bottom: 1px solid #1E1E22; }}
        .refresh {{ font-size: 11px; color: #5A5A58; margin-top: 24px; }}
        .refresh a {{ color: #E05A00; text-decoration: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="logo">[~]</span>
            <span class="title">Signall</span>
            <span class="subtitle">Training Log</span>
        </div>
        <div class="stats">
            <div class="stat">
                <div class="stat-label">Episodes</div>
                <div class="stat-value">{data["total_episodes"]}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Total Steps</div>
                <div class="stat-value">{data["total_steps"]}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Best</div>
                <div class="stat-value accent">{data["best_efficiency"]}%</div>
            </div>
            <div class="stat">
                <div class="stat-label">Avg Recent</div>
                <div class="stat-value">{data["avg_recent_efficiency"]}%</div>
            </div>
        </div>
        <div class="chart-card">
            <div class="section-label">Learning Curve</div>
            {chart}
        </div>
        <div class="chart-card">
            <div class="section-label">Recent Episodes</div>
            <table>
                <tr>
                    <th style="text-align:left;padding:6px 12px;color:#5A5A58;font-size:10px;font-weight:500">#</th>
                    <th style="text-align:left;padding:6px 12px;color:#5A5A58;font-size:10px;font-weight:500">EFFICIENCY</th>
                    <th style="text-align:left;padding:6px 12px;color:#5A5A58;font-size:10px;font-weight:500">REWARD</th>
                </tr>
                {rows}
            </table>
        </div>
        <div class="refresh">
            <a href="/training-dashboard">Refresh</a> &middot;
            Sessions: {data["sessions"]} &middot;
            Uptime: {data["uptime_seconds"] // 60}m {data["uptime_seconds"] % 60}s
        </div>
    </div>
</body>
</html>"""
    return html


def main(host: str = "0.0.0.0", port: int = 8000):
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    main(port=args.port)
