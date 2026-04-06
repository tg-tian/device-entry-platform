import mongoose, { Schema, Document } from 'mongoose';
import type { BaseDeviceModel } from '@lowcode/shared-contracts/device-model';

interface IDevice extends Document {
  deviceId: string;
  provider: string;
  category: string;
  deviceName?: string;
  isAccessible: boolean;
  metaModel?: BaseDeviceModel;
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

const DeviceSchema = new Schema<IDevice>({
  deviceId: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  category: { type: String, required: true },
  deviceName: { type: String },
  isAccessible: { type: Boolean, default: false },
  metaModel: { type: Schema.Types.Mixed },
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

export const DeviceModel = mongoose.model<IDevice>('Device', DeviceSchema);
