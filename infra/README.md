# AWS plan

This stack is **not deployed**. `infra/scripts/deploy.sh` exits unless `SIGN_TOGETHER_AWS_APPROVED=yes`.

## Resources

One CloudFormation stack, `sign-together-demo`, in `AWS_REGION` (default `us-west-2`):

| Resource | Purpose |
| --- | --- |
| API Gateway WebSocket API `sign-together` | Phone and TV connections. Stage `demo`. |
| Lambda `sign-together-relay` | Node.js 20, arm64, 256 MB, 10 second timeout. One function handles connect, disconnect, and messages. |
| DynamoDB `SessionTable` | On-demand. Stores sessions, pairing codes, join tokens, and connection ids. TTL attribute `ttl`. Point-in-time recovery off. |

No EC2, NAT gateway, SageMaker, Bedrock, or Kinesis.

The WebSocket API is public at the `$connect` route. Abuse control is API Gateway throttling (10 requests/second, burst 20) plus an in-function limit of 8 messages/second per warm container. Delete the stack after the demo. Do not treat the short pairing code as a secret.

## IAM

The Lambda role is limited to this table and this API:

- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem` on the session table only
- `execute-api:ManageConnections` on `arn:aws:execute-api:region:account:api-id/demo/POST/@connections/*`

Deploying also needs permission to create those resources and an IAM role (`CAPABILITY_IAM`), plus CloudWatch Logs for the function. That is deployment permission, not a standing admin role. Do not grant `AdministratorAccess`.

The app does not receive AWS keys. After a future deploy, copy the `WebSocketUrl` output into `AWS_RELAY_URL` and set `TRANSPORT_MODE` to `aws`.

## Cost

These are public list-price estimates, not a bill and not a check of the reported $120 credit or $20 budget. Budgets do not stop spending.

A short demo (two connections, a few hundred messages, a few dozen DynamoDB writes) is well under **$0.05**, and usually rounds to $0.00 at billing precision.

An idle stack with an empty table and no connections is about **$0** per day. The costly case is leaving the public socket up and letting it be abused. At the 10 requests/second throttle, message charges are on the order of **$1 per day** before connection-minute and Lambda charges. Clean up the same day as the demo.

Logging: the deploy script sets a **3 day** retention policy on `/aws/lambda/sign-together-relay` after the stack exists. API Gateway data tracing is off.

## Commands

Do not run these until approval.

```sh
npm install --prefix infra
SIGN_TOGETHER_AWS_APPROVED=yes AWS_REGION=us-west-2 sh infra/scripts/deploy.sh
```

The script assembles `infra/dist` (handler, shared protocol, AWS SDK) and runs `sam deploy`.

Cleanup:

```sh
SIGN_TOGETHER_AWS_APPROVED=yes AWS_REGION=us-west-2 sh infra/scripts/cleanup.sh
```

That deletes only the `sign-together-demo` stack.

## What was tested without AWS

`infra/lambda/router.test.mjs` runs the Lambda route function against the in-memory session store. It checks pairing, single delivery, and duplicate rejection. The DynamoDB adapter and API Gateway management client have not been executed against AWS.
