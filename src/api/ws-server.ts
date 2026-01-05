import http from 'http'
import { WebSocketServer } from 'ws'
import { DeviceManager } from '../device-manager/device-manager'

export function startWsServer(dm: DeviceManager, server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  console.log(`[WS] WebSocket server attached on /ws`)

  wss.on('connection', (ws) => {
    const discoveryHandler = (payload: any) => {
      console.log(`[WS] Sending discovery event: ${JSON.stringify(payload)}`)
      ws.send(JSON.stringify({ topic: 'device.discovery', data: payload }))
    }
    const updatedHandler = (payload: any) => {
      ws.send(JSON.stringify({ topic: 'device.updated', data: payload }))
    }

    dm.on('device.discovery', discoveryHandler)
    dm.on('device.updated', updatedHandler)
  
    ws.on('close', async () => {

      await dm.flushNow()

    })
  })
}
