import http from 'http'
import { WebSocketServer } from 'ws'
import type { WsMessage } from '@lowcode/shared-contracts/ws-message'
import { DeviceManager } from '../device-manager/device-manager'

export function startWsServer(dm: DeviceManager, server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  console.log(`[WS] WebSocket server attached on /ws`)

  wss.on('connection', (ws) => {
    const discoveryHandler = (payload: any) => {
      console.log(`[WS] Sending discovery event: ${JSON.stringify(payload)}`)
      const message: WsMessage = { topic: 'device.discovery', data: payload }
      ws.send(JSON.stringify(message))
    }
    const updatedHandler = (payload: any) => {
      const message: WsMessage = { topic: 'device.updated', data: payload }
      ws.send(JSON.stringify(message))
    }
    const eventHandler = (payload: any) => {
      const message: WsMessage = { topic: 'device.event', data: payload }
      ws.send(JSON.stringify(message))
    }

    dm.on('device.discovery', discoveryHandler)
    dm.on('device.updated', updatedHandler)
    dm.on('device.event', eventHandler)
    
    ws.on('close', async () => {

      await dm.flushNow()

    })
  })
}
