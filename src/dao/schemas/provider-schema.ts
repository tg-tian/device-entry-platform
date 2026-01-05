import mongoose, { Schema, Document } from 'mongoose';
import { ProviderConfig } from '../../domain/provider-config';

interface IProviderConfig extends ProviderConfig, Document {}

const ProviderConfigSchema = new Schema<IProviderConfig>({
  provider: { type: String, required: true, unique: true },
  communication: {
    protocol: { type: String, required: true },
    baseUrl: { type: String, required: true },
    webhook: {
      enabled: { type: Boolean },
      path: { type: String }
    },
    topics: {
      telemetry: { type: String },
      event: { type: String },
      command: { type: String },
      config: { type: String }
    }
  },
  auth: {
    type: { type: String },
    ak: { type: String },
    sk: { type: String },
    token: { type: String },
  }
}, { timestamps: true });

export const ProviderModel = mongoose.model<IProviderConfig>('Provider', ProviderConfigSchema);
