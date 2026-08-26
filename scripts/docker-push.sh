#!/usr/bin/env bash
#
# Build the Wissal Univers image and push it to Docker Hub (Linux/macOS).
#
#   ./scripts/docker-push.sh            # tag = short git sha (+ :latest)
#   ./scripts/docker-push.sh v1.2.0     # tag = v1.2.0 (+ :latest)
#
# Credentials are read from .env.local (DOCKERHUB_USERNAME / DOCKERHUB_TOKEN,
# and optional DOCKERHUB_IMAGE). Override the env file with ENV_FILE=... .
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.local}"
if [[ -f "$ENV_FILE" ]]; then
  # Parse KEY=VALUE lines ourselves rather than sourcing the file, so a stray
  # character in a value can't run as a shell command.
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    val="${val%\"}"; val="${val#\"}"
    export "$key=$val"
  done < "$ENV_FILE"
fi

: "${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME in $ENV_FILE}"
: "${DOCKERHUB_TOKEN:?Set DOCKERHUB_TOKEN in $ENV_FILE}"
IMAGE="${DOCKERHUB_IMAGE:-$DOCKERHUB_USERNAME/wisscreen}"
TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

echo "==> Building $IMAGE:$TAG (and :latest)"
docker build -t "$IMAGE:$TAG" -t "$IMAGE:latest" .

echo "==> Logging in to Docker Hub as $DOCKERHUB_USERNAME"
printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

echo "==> Pushing"
docker push "$IMAGE:$TAG"
docker push "$IMAGE:latest"

docker logout >/dev/null 2>&1 || true
echo "==> Done: pushed $IMAGE:$TAG and $IMAGE:latest"
