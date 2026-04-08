import { DeviceShadowModel } from './schemas/device-shadow-schema';
import type { DeviceShadow } from '@tgapk/lowcode-common/device';

/**
 * 提供设备影子数据的持久化读写能力。
 */
export class ShadowDAO {
  /**
   * 保存单个设备影子，不存在时自动创建。
   * @param shadow 待保存的设备影子。
   * @returns 保存完成后的 Promise。
   */
  async saveShadow(shadow: DeviceShadow): Promise<void> {
    await DeviceShadowModel.findOneAndUpdate(
      { deviceId: shadow.deviceId },
      {
        deviceId: shadow.deviceId,
        provider: shadow.provider,
        category: shadow.category,
        metaModel: shadow.metaModel,
        isAccessible: shadow.isAccessible,
        state: shadow.state,
        metadata: shadow.metadata
      },
      { upsert: true, new: true }
    );
  }

  /**
   * 查询单个设备影子。
   * @param deviceId 设备标识。
   * @returns 匹配的设备影子，未找到时返回 null。
   */
  async getShadow(deviceId: string): Promise<DeviceShadow | null> {
    const doc = await DeviceShadowModel.findOne({ deviceId });
    if (!doc) return null;

    return {
      deviceId: doc.deviceId,
      provider: (doc as any).provider || 'unknown',
      category: (doc as any).category || 'unknown',
      metaModel: (doc as any).metaModel,
      isAccessible: (doc as any).isAccessible ?? false,
      state: doc.state,
      metadata: doc.metadata
    };
  }

  /**
   * 查询全部设备影子。
   * @returns 设备影子列表。
   */
  async getAllShadows(): Promise<DeviceShadow[]> {
    const docs = await DeviceShadowModel.find({}).lean();
    return docs.map((doc: any) => ({
      deviceId: doc.deviceId,
      provider: doc.provider || 'unknown',
      category: doc.category || 'unknown',
      metaModel: doc.metaModel,
      isAccessible: doc.isAccessible ?? false,
      state: doc.state || { reported: {}, desired: {} },
      metadata: { ...(doc.metadata || { lastUpdated: Date.now(), version: 1 }), isOnline: false }
    }));
  }
}
