import { DeviceShadowModel } from './schemas/device-shadow-schema';
import type { DeviceShadow } from '@lowcode/shared-contracts/device';

export class ShadowDAO {
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

  async getShadow(deviceId: string): Promise<DeviceShadow | null> {
    const doc = await DeviceShadowModel.findOne({ deviceId });
    if (!doc) return null;

    return {
      deviceId: doc.deviceId,
      provider: (doc as any).provider || 'unknown',
      category: (doc as any).category || 'unknown',
      metaModel: ((doc as any).metaModel),
      isAccessible: ((doc as any).isAccessible) ?? false,
      state: doc.state,
      metadata: doc.metadata
    };
  }

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
