import dotenv from 'dotenv';
import { connectDB } from './infrastructure/database';
import { ProviderDAO } from './dao/provider-dao';
import { AdapterFactory } from './adapters/adapter-factory';
import { DeviceManager } from './device-manager/device-manager';
import { startHttpServer } from './api/http-server';
import { startWsServer } from './api/ws-server';

dotenv.config();

const PORT = (process.env.PORT || 3000) as number;

async function bootstrap() {
  await connectDB();
  const providerDAO = new ProviderDAO();
  const adapterFactory = new AdapterFactory(providerDAO);
  await adapterFactory.init();
  const dm = new DeviceManager(adapterFactory);
  const server = startHttpServer(PORT, dm);
  startWsServer(dm, server);
}

bootstrap();
