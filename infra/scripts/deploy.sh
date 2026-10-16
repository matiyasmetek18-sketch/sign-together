#!/bin/sh
# Deploys the WebSocket stack. Refuses to run until deployment is explicitly approved.
set -eu
if [ "${SIGN_TOGETHER_AWS_APPROVED:-}" != "yes" ]; then
  echo "Refusing to deploy. This creates paid AWS resources." >&2
  echo "Review infra/README.md, then re-run with SIGN_TOGETHER_AWS_APPROVED=yes." >&2
  exit 1
fi
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
sh "$ROOT/infra/scripts/assemble.sh"
cd "$ROOT/infra"
sam deploy \
  --template-file template.yaml \
  --stack-name sign-together-demo \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --region "${AWS_REGION:-us-west-2}"
aws logs put-retention-policy \
  --log-group-name /aws/lambda/sign-together-relay \
  --retention-in-days 3 \
  --region "${AWS_REGION:-us-west-2}"
echo "Deployment finished. Copy WebSocketUrl into src/config.ts and set TRANSPORT_MODE to aws."
