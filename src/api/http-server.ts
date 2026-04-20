import express from 'express';
import http from 'http';
import { DeviceDAO } from '../dao/device-dao';
import { ShadowDAO } from '../dao/shadow-dao';
import { ProviderDAO } from '../dao/provider-dao';
import { SystemConfigDAO } from '../dao/system-config-dao';
import { DeviceManager } from '../device-manager/device-manager';

/**
 * 启动对外提供设备、影子和供应商接口的 HTTP 服务。
 * @param port HTTP 服务监听端口。
 * @param dm 设备运行时管理器。
 * @returns 已创建并开始监听的 HTTP Server。
 */
export function startHttpServer(port: number, dm: DeviceManager): http.Server {
  const app = express();
  app.use(express.json());
  const deviceDAO = new DeviceDAO();
  const shadowDAO = new ShadowDAO();
  const providerDAO = new ProviderDAO();
  const systemConfigDAO = new SystemConfigDAO();

  app.get('/deviceShadows', async (_req, res) => {
    const shadows = await shadowDAO.getAllShadows();
    res.json(shadows);
  });

  app.get('/devices', async (_req, res) => {
    const devices = await deviceDAO.getAllDevices();
    res.json(devices);
  });

  app.get('/devices/by-model', async (req, res) => {
    const modelId = req.query.modelId as string;
    if (!modelId) {
      return res.status(400).json({ message: 'Missing modelId query parameter' });
    }
    const devices = await deviceDAO.getDevicesByModelId(modelId);
    res.json(devices);
  });

  app.get('/devices/:id', async (req, res) => {
    const d = await deviceDAO.getDevice(req.params.id);
    if (!d) return res.status(404).json({ message: 'not found' });
    res.json(d);
  });

  app.post('/devices', async (req, res) => {
    try {
      await deviceDAO.saveDevice(req.body);
      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.put('/devices/:id', async (req, res) => {
    try {
      await deviceDAO.updateDevice(req.params.id, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.delete('/devices/:id', async (req, res) => {
    try {
      await deviceDAO.deleteDevice(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.get('/providers', async (_req, res) => {
    const list = await providerDAO.getAllProviders();
    res.json(list);
  });

  app.get('/providers/:provider', async (req, res) => {
    const cfg = await providerDAO.getProviderConfig(req.params.provider);
    if (!cfg) return res.status(404).json({ message: 'not found' });
    res.json(cfg);
  });

  app.post('/providers', async (req, res) => {
    try {
      await providerDAO.registerProvider(req.body);
      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.put('/providers/:provider', async (req, res) => {
    try {
      await providerDAO.updateProvider(req.params.provider, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.delete('/providers/:provider', async (req, res) => {
    try {
      await providerDAO.deleteProvider(req.params.provider);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.get('/discoverDevices', async (_req, res) => {
    const list = await dm.getAllDevices();
    res.json(list);
  });

  app.get('/system/mapper-loader-url', async (_req, res) => {
    try {
      const url = await systemConfigDAO.getMapperLoaderUrl() || process.env.MAPPER_LOADER_URL || '';
      res.json({ url });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.put('/system/mapper-loader-url', async (req, res) => {
    try {
      const url = String(req.body?.url || '').trim();
      if (!url) {
        return res.status(400).json({ ok: false, error: 'Missing url' });
      }
      await systemConfigDAO.setMapperLoaderUrl(url);
      await dm.refreshMapperLibrary();
      res.json({ ok: true, url });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  app.post('/devices/command', async (req, res) => {
    try {
      await dm.sendDeviceCommand(req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e) });
    }
  });

  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`[HTTP] Server listening on port ${port}`);
  });
  return server;
}
