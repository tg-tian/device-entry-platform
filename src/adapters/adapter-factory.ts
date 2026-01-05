import { IoTAdapter } from './iot-adapter';
import { ProviderDAO } from '../dao/provider-dao';
import { MqttAdapter } from './mqtt';

export class AdapterFactory {

  private adapters: Map<string, IoTAdapter> = new Map();
  private providerDAO: ProviderDAO;

  constructor(providerDAO: ProviderDAO) {
    this.providerDAO = providerDAO;
  }

  async init(){
    const providers = await this.providerDAO.getAllProviders();
    for (const config of providers) {
      try {
        let adapter: IoTAdapter | null = null;
        if (config.communication.protocol.toLowerCase() === 'mqtt') {
          adapter = new MqttAdapter(config);
        }
        if (adapter) {
          adapter.init();
          this.adapters.set(config.provider, adapter);
          console.log(`[AdapterFactory] Initialized adapter for provider: ${config.provider}`);
        }
      } catch (err) {
        console.error(`[AdapterFactory] Failed to initialize adapter for provider ${config.provider}:`, err);
      }
    }
  }

  getAdapter(providerId: string): IoTAdapter | null {
    if (this.adapters.has(providerId)) {
      return this.adapters.get(providerId)!;
    }
    return null;
  }

  listAdapters(): IoTAdapter[] {
    return Array.from(this.adapters.values());
  }
}
