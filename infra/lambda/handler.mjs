import {createSessionService} from '../../shared/session.mjs';
import {createDynamoStore} from './dynamoStore.mjs';
import {routeMessage} from './router.mjs';

const service = createSessionService({
  store: createDynamoStore(process.env.TABLE_NAME),
});

async function post(connectionId, message) {
  const {ApiGatewayManagementApiClient, PostToConnectionCommand} = await import(
    '@aws-sdk/client-apigatewaymanagementapi'
  );
  const client = new ApiGatewayManagementApiClient({endpoint: process.env.WEBSOCKET_ENDPOINT});
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      }),
    );
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 410) {
      throw error;
    }
  }
}

export async function handler(event) {
  return routeMessage(event, {service, post});
}
