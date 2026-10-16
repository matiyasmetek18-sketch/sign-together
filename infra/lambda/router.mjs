import {parseClientMessage, MAX_MESSAGE_BYTES} from '../../shared/protocol.mjs';
import {dispatchClientMessage} from '../../shared/session.mjs';

const buckets = new Map();

export async function routeMessage(event, deps) {
  const connectionId = event.requestContext?.connectionId;
  const route = event.requestContext?.routeKey ?? '$default';
  if (!connectionId) {
    return {statusCode: 400};
  }
  if (route === '$connect') {
    return {statusCode: 200};
  }
  if (route === '$disconnect') {
    const result = await deps.service.disconnect(connectionId);
    await deliver(result, connectionId, deps.post);
    return {statusCode: 200};
  }
  const body = typeof event.body === 'string' ? event.body : '';
  if (byteLength(body) > MAX_MESSAGE_BYTES) {
    await deps.post(connectionId, {v: 1, type: 'error', code: 'payload-too-large', message: 'payload-too-large'});
    return {statusCode: 200};
  }
  if (!allow(connectionId)) {
    await deps.post(connectionId, {v: 1, type: 'error', code: 'rate-limited', message: 'rate-limited'});
    return {statusCode: 200};
  }
  const parsed = parseClientMessage(body);
  if (!parsed.ok) {
    await deps.post(connectionId, {v: 1, type: 'error', code: parsed.error, message: parsed.error});
    return {statusCode: 200};
  }
  const result = await dispatchClientMessage(deps.service, connectionId, parsed.message);
  await deliver(result, connectionId, deps.post);
  return {statusCode: 200};
}

async function deliver(result, selfId, post) {
  for (const item of result.send ?? []) {
    const targetId =
      item.role === 'self'
        ? selfId
        : item.role === 'tv'
          ? result.session?.tvConnectionId
          : result.session?.phoneConnectionId;
    if (targetId) {
      await post(targetId, item.message);
    }
  }
}

function allow(connectionId) {
  const now = Date.now();
  const recent = (buckets.get(connectionId) ?? []).filter((stamp) => now - stamp < 1000);
  if (recent.length >= 8) {
    buckets.set(connectionId, recent);
    return false;
  }
  recent.push(now);
  buckets.set(connectionId, recent);
  return true;
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}
