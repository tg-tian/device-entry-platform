import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { ProviderModel } from './schemas/provider-schema';

/**
 * 提供供应商接入配置的持久化读写能力。
 */
export class ProviderDAO {
  /**
   * 查询单个供应商配置。
   * @param provider 供应商标识。
   * @returns 匹配的供应商配置，未找到时返回 undefined。
   */
  async getProviderConfig(provider: string): Promise<ProviderConfig | undefined> {
    const config = await ProviderModel.findOne({ provider }).lean();
    return config ? (config as unknown as ProviderConfig) : undefined;
  }

  /**
   * 查询全部供应商配置。
   * @returns 供应商配置列表。
   */
  async getAllProviders(): Promise<ProviderConfig[]> {
    const configs = await ProviderModel.find().lean();
    return configs as unknown as ProviderConfig[];
  }

  /**
   * 注册供应商配置，不存在时自动创建。
   * @param config 待保存的供应商配置。
   * @returns 保存完成后的 Promise。
   */
  async registerProvider(config: ProviderConfig): Promise<void> {
    await ProviderModel.findOneAndUpdate(
      { provider: config.provider },
      config,
      { upsert: true, new: true }
    );
  }

  /**
   * 按补丁更新供应商配置。
   * @param provider 供应商标识。
   * @param patch 待更新的配置字段。
   * @returns 更新完成后的 Promise。
   */
  async updateProvider(provider: string, patch: Partial<ProviderConfig>): Promise<void> {
    await ProviderModel.findOneAndUpdate(
      { provider },
      { $set: patch },
      { new: true }
    );
  }

  /**
   * 删除指定供应商配置。
   * @param provider 供应商标识。
   * @returns 删除完成后的 Promise。
   */
  async deleteProvider(provider: string): Promise<void> {
    await ProviderModel.deleteOne({ provider });
  }
}
