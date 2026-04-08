import { EventEmitter } from 'events';
import { AdapterFactory } from '../adapters/adapter-factory';
import { ShadowManager } from './shadow/shadow-manager';
import { InMemoryShadowManager } from './shadow/in-memory-shadow';
import type { DeviceShadow } from '@tgapk/lowcode-common/device';
import { UnifiedEvent } from '../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';
import { ShadowDAO } from '../dao/shadow-dao';

/**
 * 负责统一处理设备事件、影子状态与命令路由。
 */
export class DeviceManager extends EventEmitter {
  private adapterFactory: AdapterFactory;
  private shadowManager: ShadowManager;
  private shadowDAO: ShadowDAO;
  private offlineTimeoutMs = Number(process.env.DEVICE_OFFLINE_TIMEOUT_MS || 5000);
  private offlineSweepIntervalMs = Number(process.env.DEVICE_OFFLINE_SWEEP_INTERVAL_MS || 5000);
  private offlineSweepTimer: NodeJS.Timeout | null = null;

  /**
   * 创建设备运行时管理器。
   * @param adapterFactory 已初始化的适配器工厂。
   */
  constructor(adapterFactory: AdapterFactory) {
    super();
    this.adapterFactory = adapterFactory;
    this.shadowManager = new InMemoryShadowManager();
    this.shadowDAO = new ShadowDAO();
    for (const adapter of this.adapterFactory.listAdapters()) {
      adapter.setEventHandler((event) => this.handleDeviceEvent(event));
    }
    this.startOfflineSweep();
  }

  /**
   * 获取当前全部设备影子。
   * @returns 设备影子列表。
   */
  async getAllDevices(): Promise<DeviceShadow[]> {
    return await this.shadowManager.getAll();
  }

  /**
   * 根据发现信息创建或登记设备影子。
   * @param device 设备发现阶段上报的原始信息。
   * @returns 影子写入完成后的 Promise。
   */
  async addDevice(device: any): Promise<void> {
    const shadow: DeviceShadow = {
      deviceId: device.deviceId,
      provider: device.provider,
      category: device.category,
      deviceName: device.deviceName,
      metaModel: device.metaModel,
      isAccessible: device.isAccessible ?? false,
      state: { reported: {}, desired: {} },
      metadata: { lastUpdated: Date.now(), isOnline: true, version: 1 }
    };
    await this.shadowManager.addDevice(shadow);
  }

  /**
   * 更新设备上报属性并广播最新影子。
   * @param deviceId 设备标识。
   * @param payload 设备属性数据。
   * @returns 更新完成后的 Promise。
   */
  async updateDevice(deviceId: string, payload: any): Promise<void> {
    await this.shadowManager.updateReported(deviceId, payload);
    const shadow = await this.shadowManager.get(deviceId);
    if (shadow) {
      this.emit('device.updated', shadow);
    }
  }

  /**
   * 更新设备在线状态并广播最新影子。
   * @param deviceId 设备标识。
   * @param isOnline 当前在线状态。
   * @returns 更新完成后的 Promise。
   */
  async updateDeviceStatus(deviceId: string, isOnline: boolean): Promise<void> {
    await this.shadowManager.updateStatus(deviceId, isOnline);
    const shadow = await this.shadowManager.get(deviceId);
    if (shadow) {
      this.emit('device.updated', shadow);
    }
  }

  /**
   * 向上层广播设备事件。
   * @param deviceId 设备标识。
   * @param payload 事件负载。
   * @param deviceModel 设备模型标识。
   * @returns 事件广播完成后的 Promise。
   */
  async reportEvent(deviceId: string, payload: any, deviceModel?: string): Promise<void> {
    this.emit('device.event', { deviceId, payload, deviceModel });
  }

  /**
   * 将控制命令路由到设备所属适配器。
   * @param command 待发送的设备命令。
   * @returns 命令处理完成后的 Promise。
   */
  async sendDeviceCommand(command: DeviceCommand): Promise<void> {
    const deviceId = command.deviceId;
    if (!deviceId) return;
    const device = await this.shadowManager.get(deviceId);
    if (!device) return;
    const adapter = this.adapterFactory.getAdapter(device.provider);
    if (adapter) {
      adapter.sendDeviceCommand(command);
    }
  }

  /**
   * 按统一事件类型更新设备影子或广播事件。
   * @param event 适配器转换后的统一事件。
   * @returns 处理完成后的 Promise。
   */
  async handleDeviceEvent(event: UnifiedEvent): Promise<void> {
    const deviceId = event.deviceId;
    if (!deviceId) return;
    console.log(`[DeviceManager] Received event type: ${event.type} for ${deviceId}`);

    if (event.type === 'config') {
      console.log(`[DeviceManager] Registering device from config: ${deviceId}`);
      this.addDevice(event.payload);
    } else if (event.type === 'property') {
      console.log(`[DeviceManager] Updating properties for ${deviceId}`, event.payload);
      this.updateDevice(deviceId, event.payload);
    } else if (event.type === 'event') {
      console.log(`[DeviceManager] Reporting event for ${deviceId}`, event);
      this.reportEvent(deviceId, event.payload, event.deviceModel);
    } else if (event.type === 'status') {
      console.log(`[DeviceManager] Updating status for ${deviceId}:`, event.payload);
      this.updateDeviceStatus(deviceId, !!event.payload?.isOnline);
    }
  }

  /**
   * 周期性扫描超时设备并标记为离线。
   * @returns 无返回值。
   */
  private startOfflineSweep(): void {
    if (this.offlineSweepTimer) return;
    this.offlineSweepTimer = setInterval(async () => {
      try {
        const all = await this.shadowManager.getAll();
        const now = Date.now();
        for (const shadow of all) {
          const isStale = now - (shadow.metadata?.lastUpdated ?? 0) > this.offlineTimeoutMs;
          if (shadow.metadata?.isOnline && isStale) {
            await this.updateDeviceStatus(shadow.deviceId, false);
          }
        }
      } catch (e) {
        console.error('[DeviceManager] Offline sweep failed', e);
      }
    }, this.offlineSweepIntervalMs);
  }

  /**
   * 立即将当前全部设备影子刷入持久层。
   * @returns 持久化完成后的 Promise。
   */
  async flushNow(): Promise<void> {
    const all = await this.shadowManager.getAll();
    for (const shadow of all) {
      await this.shadowDAO.saveShadow(shadow);
    }
  }
}
