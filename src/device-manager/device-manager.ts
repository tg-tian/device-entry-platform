import { EventEmitter } from 'events';
import { AdapterFactory } from '../adapters/adapter-factory';
import { ShadowManager } from './shadow/shadow-manager';
import { InMemoryShadowManager } from './shadow/in-memory-shadow';
import { DeviceShadow } from '../domain/device-shadow';
import { UnifiedEvent } from '../domain/unified-event';
import { ShadowDAO } from '../dao/shadow-dao';

export class DeviceManager extends EventEmitter {
  private adapterFactory: AdapterFactory;
  private shadowManager: ShadowManager;
  private shadowDAO: ShadowDAO;

  constructor(adapterFactory: AdapterFactory) {
    super();
    this.adapterFactory = adapterFactory;
    this.shadowManager = new InMemoryShadowManager();
    this.shadowDAO = new ShadowDAO();
    for (const adapter of this.adapterFactory.listAdapters()) {
      adapter.setEventHandler((event) => this.handleDeviceEvent(event));
    }
  }

  // 获取所有设备
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

  async sendDeviceCommand(command: any): Promise<void> {
    const deviceId = command.deviceId;
    if (!deviceId) return;
    let device = await this.shadowManager.get(deviceId);
    if (!device) return;
    const adapter = this.adapterFactory.getAdapter(device.provider);
    if (adapter) {
      adapter.sendDeviceCommand(command);
    }
  }

  registerMapper(){
    
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
     
    }
  }

  async flushNow(): Promise<void> {
    const all = await this.shadowManager.getAll();
    for (const shadow of all) {
      await this.shadowDAO.saveShadow(shadow);
    }
  }
}
