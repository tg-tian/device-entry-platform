import { IoTAdapter } from './iot-adapter';
import { ProviderDAO } from '../dao/provider-dao';
import { MqttAdapter } from './mqtt';

/**
 * 根据供应商配置创建并缓存适配器实例。
 */
export class AdapterFactory {
  private adapters: Map<string, IoTAdapter> = new Map();
  private providerDAO: ProviderDAO;

  /**
   * 创建适配器工厂。
   * @param providerDAO 供应商配置访问对象。
   */
  constructor(providerDAO: ProviderDAO) {
    this.providerDAO = providerDAO;
  }

  /**
   * 加载全部供应商配置并初始化对应适配器。
   * @returns 初始化完成后的 Promise。
   */
  async init(): Promise<void> {
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

  /**
   * 获取指定供应商的适配器实例。
   * @param providerId 供应商标识。
   * @returns 匹配的适配器，未找到时返回 null。
   */
  getAdapter(providerId: string): IoTAdapter | null {
    if (this.adapters.has(providerId)) {
      return this.adapters.get(providerId)!;
    }
    return null;
  }

  /**
   * 返回当前已初始化的全部适配器。
   * @returns 适配器列表。
   */
  listAdapters(): IoTAdapter[] {
    return Array.from(this.adapters.values());
  }
}
