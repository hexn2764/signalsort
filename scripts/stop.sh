#!/usr/bin/env bash
# Stop the app and every agent. Touches nothing on GitHub.
#
#   ./scripts/stop.sh
set -uo pipefail

echo "==> Stopping agents and app"
stopped=0
for pat in "src/agents/reporter.ts" "src/agents/triage.ts" "src/agents/solver.ts" \
           "scripts/autopilot.mjs" "src/server.ts"; do
  if pkill -f "$pat" 2>/dev/null; then
    echo "    stopped: $pat"
    stopped=1
  fi
done
[[ $stopped -eq 0 ]] && echo "    nothing was running"

sleep 1
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "    port 3000 still busy — forcing"
  lsof -ti:3000 | xargs kill -9 2>/dev/null
fi

echo
echo "==> Check"
left=$(pgrep -f "src/agents" | wc -l | tr -d ' ')
echo "    agent processes still alive: $left"
echo "    port 3000: $(lsof -ti:3000 >/dev/null 2>&1 && echo BUSY || echo free)"
