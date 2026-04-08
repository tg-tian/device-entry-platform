import type { DeviceShadow } from '@tgapk/lowcode-common/device';
import { ShadowManager } from './shadow-manager';
import { ShadowDAO } from '../../dao/shadow-dao';

/**
 * 基于内存维护设备影子，并在启动时回填持久化数据。
 */
export class InMemoryShadowManager implements ShadowManager {
  private shadows: Map<string, DeviceShadow> = new Map();
  private shadowDAO = new ShadowDAO();

  /**
   * 创建内存影子管理器并异步加载已持久化影子。
   */
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

  /**
   * 获取指定设备影子。
   * @param deviceId 设备标识。
   * @returns 匹配的设备影子，未找到时返回 undefined。
   */
  async get(deviceId: string): Promise<DeviceShadow | undefined> {
    return this.shadows.get(deviceId);
  }

  /**
   * 覆盖设备最新上报属性并刷新元数据。
   * @param deviceId 设备标识。
   * @param state 最新上报属性。
   * @returns 更新完成后的 Promise。
   */
  async updateReported(deviceId: string, state: Record<string, any>): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;

    shadow.state.reported = state;
    shadow.metadata.lastUpdated = Date.now();
    shadow.metadata.isOnline = true;
    shadow.metadata.version++;
  }

  /**
   * 合并设备期望属性并刷新元数据。
   * @param deviceId 设备标识。
   * @param state 最新期望属性。
   * @returns 更新完成后的 Promise。
   */
  async updateDesired(deviceId: string, state: Record<string, any>): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;

    shadow.state.desired = { ...shadow.state.desired, ...state };
    shadow.metadata.lastUpdated = Date.now();
    shadow.metadata.version++;
  }

  /**
   * 更新设备在线标记。
   * @param deviceId 设备标识。
   * @param isOnline 当前在线状态。
   * @returns 更新完成后的 Promise。
   */
  async updateStatus(deviceId: string, isOnline: boolean): Promise<void> {
    const shadow = this.shadows.get(deviceId);
    if (!shadow) return;

    shadow.metadata.isOnline = isOnline;
    shadow.metadata.lastUpdated = Date.now();
  }

  /**
   * 添加新设备影子，已存在时同步其基础信息。
   * @param info 设备影子数据。
   * @returns 添加完成后的 Promise。
   */
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

  /**
   * 删除指定设备影子。
   * @param deviceId 设备标识。
   * @returns 删除完成后的 Promise。
   */
  async removeDevice(deviceId: string): Promise<void> {
    this.shadows.delete(deviceId);
  }

  /**
   * 获取当前内存中的全部设备影子。
   * @returns 设备影子列表。
   */
  async getAll(): Promise<DeviceShadow[]> {
    return Array.from(this.shadows.values());
  }
}
