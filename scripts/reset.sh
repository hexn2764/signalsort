#!/usr/bin/env bash
# Reset the Backlog Autopilot demo back to a clean repository.
#
#   ./scripts/reset.sh          # ask before each destructive step
#   ./scripts/reset.sh --yes    # no questions, for between demo runs
#
# Never touches main. Never touches merged pull requests. Never touches
# anything a human opened.
set -uo pipefail

AUTO=0
[[ "${1:-}" == "--yes" ]] && AUTO=1

confirm() {
  [[ $AUTO -eq 1 ]] && return 0
  read -r -p "$1 [y/N] " a
  [[ "$a" == "y" || "$a" == "Y" ]]
}

echo "==> Stopping any running agents"
pkill -f "src/agents" 2>/dev/null && echo "    agents stopped" || echo "    none running"
pkill -f "scripts/autopilot.mjs" 2>/dev/null
pkill -f "tsx src/server.ts" 2>/dev/null && echo "    server stopped" || true

echo
echo "==> Open pull requests opened by the autopilot"
prs=$(gh pr list --state open --json number,headRefName \
      --jq '.[] | select(.headRefName | startswith("autopilot/")) | .number')
if [[ -z "$prs" ]]; then
  echo "    none"
else
  echo "    $(echo "$prs" | tr '\n' ' ')"
  if confirm "    Close these pull requests?"; then
    for n in $prs; do gh pr close "$n" --comment "Demo reset." --delete-branch && echo "    closed #$n"; done
  fi
fi

echo
echo "==> Open issues filed by the autopilot"
issues=$(gh issue list --state open --label autopilot --json number --jq '.[].number')
if [[ -z "$issues" ]]; then
  echo "    none"
else
  echo "    $(echo "$issues" | tr '\n' ' ')"
  if confirm "    Close these issues?"; then
    for n in $issues; do gh issue close "$n" -r "not planned" -c "Demo reset." && echo "    closed #$n"; done
  fi
fi

echo
echo "==> Branches"
git fetch --prune origin >/dev/null 2>&1
remote=$(git branch -r --list 'origin/autopilot/*' | sed 's#origin/##' | xargs)
local=$(git branch --list 'autopilot/*' | xargs)
if [[ -n "$remote" ]]; then
  echo "    remote: $remote"
  confirm "    Delete remote autopilot branches?" && for b in $remote; do git push origin --delete "$b" >/dev/null 2>&1 && echo "    deleted origin/$b"; done
fi
if [[ -n "$local" ]]; then
  echo "    local: $local"
  confirm "    Delete local autopilot branches?" && for b in $local; do git branch -D "$b" >/dev/null && echo "    deleted $b"; done
fi
[[ -z "$remote" && -z "$local" ]] && echo "    none"

echo
echo "==> Worktrees and agent log"
git worktree prune
rm -rf .autopilot
echo "    pruned"

echo
echo "==> Done."
git status -sb | head -3
