import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { ProviderModel } from './schemas/provider-schema';

export class ProviderDAO {
  async getProviderConfig(provider: string): Promise<ProviderConfig | undefined> {
    const config = await ProviderModel.findOne({ provider }).lean();
    return config ? (config as unknown as ProviderConfig) : undefined;
  }

  async getAllProviders(): Promise<ProviderConfig[]> {
    const configs = await ProviderModel.find().lean();
    return configs as unknown as ProviderConfig[];
  }

  async registerProvider(config: ProviderConfig): Promise<void> {
    await ProviderModel.findOneAndUpdate(
      { provider: config.provider },
      config,
      { upsert: true, new: true }
    );
  }

  async updateProvider(provider: string, patch: Partial<ProviderConfig>): Promise<void> {
    await ProviderModel.findOneAndUpdate(
      { provider },
      { $set: patch },
      { new: true }
    );
  }

  async deleteProvider(provider: string): Promise<void> {
    await ProviderModel.deleteOne({ provider });
  }
}
