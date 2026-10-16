/**
 * Local relay is the default until an AWS WebSocket URL is approved and filled in.
 * The Vega simulator does not share the Mac's loopback address. If the TV cannot
 * connect, replace LOCAL_RELAY_URL with ws://<your-mac-lan-ip>:8787.
 */
export const TRANSPORT_MODE = 'local' as 'local' | 'aws';

export const LOCAL_RELAY_URL = 'ws://127.0.0.1:8787';

export const AWS_RELAY_URL = '';

export const PHONE_PAGE_URL = 'http://127.0.0.1:8787';

export function relayUrl(): string {
  if (TRANSPORT_MODE === 'aws') {
    return AWS_RELAY_URL;
  }
  return LOCAL_RELAY_URL;
}
