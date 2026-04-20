import { SystemConfigModel } from './schemas/system-config-schema';

const MAPPER_LOADER_URL_KEY = 'mapperLoaderUrl';

export class SystemConfigDAO {
  async getMapperLoaderUrl(): Promise<string | undefined> {
    const doc = await SystemConfigModel.findOne({ key: MAPPER_LOADER_URL_KEY }).lean();
    return doc?.value;
  }

  async setMapperLoaderUrl(url: string): Promise<void> {
    await SystemConfigModel.findOneAndUpdate(
      { key: MAPPER_LOADER_URL_KEY },
      { key: MAPPER_LOADER_URL_KEY, value: url },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
