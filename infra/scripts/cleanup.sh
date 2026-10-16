#!/bin/sh
# Deletes the Sign Together demo stack. Does not touch any other AWS resources.
set -eu
if [ "${SIGN_TOGETHER_AWS_APPROVED:-}" != "yes" ]; then
  echo "Refusing to delete cloud resources without SIGN_TOGETHER_AWS_APPROVED=yes." >&2
  exit 1
fi
aws cloudformation delete-stack \
  --stack-name sign-together-demo \
  --region "${AWS_REGION:-us-west-2}"
aws cloudformation wait stack-delete-complete \
  --stack-name sign-together-demo \
  --region "${AWS_REGION:-us-west-2}"
echo "Deleted stack sign-together-demo."
