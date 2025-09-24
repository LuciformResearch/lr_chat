#!/usr/bin/env bash
set -euo pipefail

# Push to both GitLab and GitHub remotes
# Usage: ./dual_push.sh [--branch BRANCH] [--message "commit message"]

BRANCH=""
MESSAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift; shift;;
    --message) MESSAGE="$2"; shift; shift;;
    -h|--help)
      echo "Usage: $0 [--branch BRANCH] [--message \"commit message\"]"; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

# Determine current branch if not provided
if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
fi

echo "[push] Branch: $BRANCH"

# Check if there are uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ -z "$MESSAGE" ]]; then
    echo "❌ ERREUR: Il y a des changements non commitées et aucun message fourni!"
    echo "   Utilisez: ./dual_push.sh --message \"votre message de commit\""
    echo "   Ou committez d'abord avec: git add . && git commit -m \"message\""
    exit 1
  else
    echo "[commit] Message: $MESSAGE"
    git add .
    git commit -m "$MESSAGE"
  fi
else
  echo "[info] Aucun changement à committer"
fi

# Push to GitLab (origin)
echo "[push] GitLab (origin)"
git push origin "$BRANCH" --follow-tags

# Push to GitHub
echo "[push] GitHub"
git push github "$BRANCH" --follow-tags

echo "[done] Pushed to both remotes"