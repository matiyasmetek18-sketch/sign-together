/**
 * DynamoDB adapter for the session service.
 * Items expire through the table TTL attribute. This file is packaged for
 * Lambda and is not used by the local relay.
 */

const SESSION = 'META';

export function createDynamoStore(tableName) {
  let documents = null;

  async function db() {
    if (!documents) {
      const {DynamoDBClient} = await import('@aws-sdk/client-dynamodb');
      const {DynamoDBDocumentClient} = await import('@aws-sdk/lib-dynamodb');
      documents = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    }
    return documents;
  }

  async function getItem(pk) {
    const {GetCommand} = await import('@aws-sdk/lib-dynamodb');
    const result = await (await db()).send(new GetCommand({TableName: tableName, Key: {pk, sk: SESSION}}));
    return result.Item ?? null;
  }

  async function putItem(item) {
    const {PutCommand} = await import('@aws-sdk/lib-dynamodb');
    await (await db()).send(new PutCommand({TableName: tableName, Item: item}));
  }

  async function deleteItem(pk) {
    const {DeleteCommand} = await import('@aws-sdk/lib-dynamodb');
    await (await db()).send(new DeleteCommand({TableName: tableName, Key: {pk, sk: SESSION}}));
  }

  async function readSession(sessionId) {
    const item = await getItem(`SESSION#${sessionId}`);
    return item ? JSON.parse(item.payload) : null;
  }

  return {
    async put(session) {
      const ttl = Math.floor(session.expiresAt / 1000);
      await putItem({
        pk: `SESSION#${session.sessionId}`,
        sk: SESSION,
        payload: JSON.stringify(session),
        ttl,
      });
      if (session.code) {
        await putItem({pk: `CODE#${session.code}`, sk: SESSION, sessionId: session.sessionId, ttl});
      }
      if (session.joinToken) {
        await putItem({pk: `TOKEN#${session.joinToken}`, sk: SESSION, sessionId: session.sessionId, ttl});
      }
    },
    async get(sessionId) {
      return readSession(sessionId);
    },
    async getByCode(code) {
      const item = await getItem(`CODE#${code}`);
      return item ? readSession(item.sessionId) : null;
    },
    async findByJoinToken(token) {
      const item = await getItem(`TOKEN#${token}`);
      return item ? readSession(item.sessionId) : null;
    },
    async getByConnection(connectionId) {
      const item = await getItem(`CONN#${connectionId}`);
      if (!item) {
        return null;
      }
      const session = await readSession(item.sessionId);
      return session ? {session, role: item.role} : null;
    },
    async bind(connectionId, sessionId, role) {
      await putItem({
        pk: `CONN#${connectionId}`,
        sk: SESSION,
        sessionId,
        role,
        ttl: Math.floor(Date.now() / 1000) + 30 * 60,
      });
    },
    async unbind(connectionId) {
      await deleteItem(`CONN#${connectionId}`);
    },
    async dropCode(code) {
      await deleteItem(`CODE#${code}`);
    },
    async remove(sessionId) {
      const session = await readSession(sessionId);
      if (!session) {
        return;
      }
      await deleteItem(`SESSION#${sessionId}`);
      if (session.code) {
        await deleteItem(`CODE#${session.code}`);
      }
      if (session.joinToken) {
        await deleteItem(`TOKEN#${session.joinToken}`);
      }
      if (session.tvConnectionId) {
        await deleteItem(`CONN#${session.tvConnectionId}`);
      }
      if (session.phoneConnectionId) {
        await deleteItem(`CONN#${session.phoneConnectionId}`);
      }
    },
  };
}
