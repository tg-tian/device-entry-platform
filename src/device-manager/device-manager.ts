import { EventEmitter } from 'events';
import { AdapterFactory } from '../adapters/adapter-factory';
import { ShadowManager } from './shadow/shadow-manager';
import { InMemoryShadowManager } from './shadow/in-memory-shadow';
import type { DeviceShadow } from '@tgapk/lowcode-common/device';
import { UnifiedEvent } from '../model/unified-event';
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command';
import { ShadowDAO } from '../dao/shadow-dao';

export class DeviceManager extends EventEmitter {
  private adapterFactory: AdapterFactory;
  private shadowManager: ShadowManager;
  private shadowDAO: ShadowDAO;
  private offlineTimeoutMs = Number(process.env.DEVICE_OFFLINE_TIMEOUT_MS || 5000);
  private offlineSweepIntervalMs = Number(process.env.DEVICE_OFFLINE_SWEEP_INTERVAL_MS || 5000);
  private offlineSweepTimer: NodeJS.Timeout | null = null;

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

  async getAllDevices(): Promise<DeviceShadow[]> {
    return await this.shadowManager.getAll();
  }

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

  async updateDevice(deviceId: string, payload: any): Promise<void> {
    await this.shadowManager.updateReported(deviceId, payload);
    const shadow = await this.shadowManager.get(deviceId);
    if (shadow) 
      this.emit('device.updated', shadow);
  }

  async updateDeviceStatus(deviceId: string, isOnline: boolean): Promise<void> {
    await this.shadowManager.updateStatus(deviceId, isOnline);
    const shadow = await this.shadowManager.get(deviceId);
    if (shadow) {
      this.emit('device.updated', shadow);
    }
  }

  async reportEvent(deviceId: string, payload: any, deviceModel?: string): Promise<void> {
    this.emit('device.event', { deviceId, payload, deviceModel });
  }

  async sendDeviceCommand(command: DeviceCommand): Promise<void> {
    const deviceId = command.deviceId;
    if (!deviceId) return;
    let device = await this.shadowManager.get(deviceId);
    if (!device) return;
    const adapter = this.adapterFactory.getAdapter(device.provider);
    if (adapter) {
      adapter.sendDeviceCommand(command);
    }
  }


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

  async flushNow(): Promise<void> {
    const all = await this.shadowManager.getAll();
    for (const shadow of all) {
      await this.shadowDAO.saveShadow(shadow);
    }
  }
}
