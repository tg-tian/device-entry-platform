import type { DeviceShadow } from '@lowcode/shared-contracts/device';
import { ShadowManager } from './shadow-manager';
import { ShadowDAO } from '../../dao/shadow-dao';

export class InMemoryShadowManager implements ShadowManager {
  private shadows: Map<string, DeviceShadow> = new Map();
  private shadowDAO = new ShadowDAO();
  constructor() {
    this.shadowDAO.getAllShadows().then((persisted) => {
      for (const p of persisted) {
        this.shadows.set(p.deviceId, {
          deviceId: p.deviceId,
          provider: p.provider,
          category: p.category,
          metaModel: p.metaModel,
          isAccessible: p.isAccessible ?? false,
          state: p.state || { reported: {}, desired: {} },
          metadata: { ...p.metadata, isOnline: false }
        });
      }
    }).catch((e) => {
      console.error('[InMemoryShadowManager] Failed to load shadows from DB', e);
    });
  }

  async get(deviceId: string): Promise<DeviceShadow | undefined> {
    return this.shadows.get(deviceId);
  }

  async updateReported(deviceId: string, state: Record<string, any>): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;

    shadow.state.reported = state;
    shadow.metadata.lastUpdated = Date.now();
    shadow.metadata.isOnline = true;
    shadow.metadata.version++;
  }

  async updateDesired(deviceId: string, state: Record<string, any>): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;
    
    shadow.state.desired = { ...shadow.state.desired, ...state };
    shadow.metadata.lastUpdated = Date.now();
    shadow.metadata.version++;
  }

  async updateStatus(deviceId: string, isOnline: boolean): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;
    
    shadow.metadata.isOnline = isOnline;
    shadow.metadata.lastUpdated = Date.now();
  }

  async addDevice(info: DeviceShadow): Promise<void> {
    if (this.shadows.has(info.deviceId)) {
        const existing = this.shadows.get(info.deviceId)!;
        existing.provider = info.provider;
        existing.category = info.category;
        existing.deviceName = info.deviceName;
        existing.metaModel = info.metaModel;
        existing.isAccessible = info.isAccessible;
        existing.metadata.isOnline = true;
        return;
    }
    
    this.shadows.set(info.deviceId, info);
  }

  async removeDevice(deviceId: string): Promise<void> {
    this.shadows.delete(deviceId);
  }

  async getAll(): Promise<DeviceShadow[]> {
    return Array.from(this.shadows.values());
  }
}
