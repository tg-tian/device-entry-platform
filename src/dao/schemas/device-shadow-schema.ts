import mongoose, { Schema, Document } from 'mongoose';

interface IDeviceShadow extends Document {
  deviceId: string;
  provider: string;
  category: string;
  deviceName?: string;
  metaModel?: Record<string, any>;
  isAccessible?: boolean;
  state: {
    reported: Record<string, any>;
    desired: Record<string, any>;
  };
  metadata: {
    lastUpdated: number;
    isOnline: boolean;
    version: number;
  };
}

const DeviceShadowSchema = new Schema<IDeviceShadow>({
  deviceId: { type: String, required: true, unique: true },
  provider: { type: String, default: 'unknown' },
  category: { type: String, default: 'unknown' },
  metaModel: { type: Schema.Types.Mixed },
  isAccessible: { type: Boolean, default: false },
  state: {
    reported: { type: Schema.Types.Mixed, default: {} },
    desired: { type: Schema.Types.Mixed, default: {} }
  },
  metadata: {
    lastUpdated: { type: Number, default: Date.now },
    isOnline: { type: Boolean, default: false },
    version: { type: Number, default: 1 }
  }
}, { timestamps: true });

export const DeviceShadowModel = mongoose.model<IDeviceShadow>('DeviceShadow', DeviceShadowSchema);
