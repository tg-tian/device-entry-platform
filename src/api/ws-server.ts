import http from 'http';
import { WebSocketServer } from 'ws';
import type { WsMessage } from '@tgapk/lowcode-common/ws-message';
import { DeviceManager } from '../device-manager/device-manager';

/**
 * 将设备事件广播能力挂载到现有 HTTP 服务上。
 * @param dm 设备运行时管理器。
 * @param server 已启动的 HTTP Server。
 * @returns 无返回值。
 */
export function startWsServer(dm: DeviceManager, server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });
  console.log('[WS] WebSocket server attached on /ws');

  wss.on('connection', (ws) => {
    const discoveryHandler = (payload: any) => {
      console.log(`[WS] Sending discovery event: ${JSON.stringify(payload)}`);
      const message: WsMessage = { topic: 'device.discovery', data: payload };
      ws.send(JSON.stringify(message));
    };
    const updatedHandler = (payload: any) => {
      const message: WsMessage = { topic: 'device.updated', data: payload };
      ws.send(JSON.stringify(message));
    };
    const eventHandler = (payload: any) => {
      const message: WsMessage = { topic: 'device.event', data: payload };
      ws.send(JSON.stringify(message));
    };

    dm.on('device.discovery', discoveryHandler);
    dm.on('device.updated', updatedHandler);
    dm.on('device.event', eventHandler);

    ws.on('close', async () => {
      await dm.flushNow();
    });
  });
}
