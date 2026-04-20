import axios from 'axios';
import * as ts from 'typescript';
import * as vm from 'vm';
import * as mqtt from 'mqtt';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { DeviceMapper } from './device-mapper';
import type { BaseDeviceModel } from '@tgapk/lowcode-common/device-model';
import { SystemConfigDAO } from '../dao/system-config-dao';

export type MapperLoadReason = 'missing_library_url' | 'missing_mapper' | 'missing_model' | 'mapper_error';

export interface MapperLoadResult {
  mapper: DeviceMapper | null;
  reason?: MapperLoadReason;
  message?: string;
}

/**
 * 从远端服务加载并实例化设备映射器。
 */
export class MapperLoader {
  private readonly systemConfigDAO = new SystemConfigDAO();

  /**
   * 按设备信息与供应商配置加载映射器。
   * @param rawDevice 设备原始配置数据。
   * @param config 供应商接入配置。
   * @returns 成功时返回映射器实例，否则返回 null。
   */
  async loadMapper(rawDevice: any, config: ProviderConfig): Promise<DeviceMapper | null> {
    const result = await this.loadMapperWithReason(rawDevice, config);
    return result.mapper;
  }

  async loadMapperWithReason(rawDevice: any, config: ProviderConfig): Promise<MapperLoadResult> {
    const url = await this.systemConfigDAO.getMapperLoaderUrl() || process.env.MAPPER_LOADER_URL;
    const { provider, deviceModel } = rawDevice;
    if (!url) {
      console.error('[MapperLoader] MAPPER_LOADER_URL is not configured');
      return { mapper: null, reason: 'missing_library_url', message: '设备库地址未配置' };
    }

    const mapperUrl = `${url}/device/mapper?provider=${provider}&deviceId=${deviceModel}`;

    try {
      const mapperResponse = await axios.get(mapperUrl, { responseType: 'json' });
      const { content, modelId } = mapperResponse.data || {};

      if (!content || !modelId) {
        console.error('[MapperLoader] Invalid mapper response:', mapperResponse.data);
        return { mapper: null, reason: 'missing_mapper', message: '未找到可用的设备 Mapper' };
      }

      const modelUrl = `${url}/meta/device-models/${modelId}`;
      let modelResponse;
      try {
        modelResponse = await axios.get(modelUrl, { responseType: 'json' });
      } catch (error) {
        console.error('[MapperLoader] Failed to load device model:', error);
        return { mapper: null, reason: 'missing_model', message: 'Mapper 已存在，但对应设备元模型不存在' };
      }
      const tsCode = content;
      const deviceModelData: BaseDeviceModel = modelResponse.data.model;

      if (!tsCode || !deviceModelData) {
        return { mapper: null, reason: 'missing_model', message: '设备元模型数据不完整' };
      }

      const jsCode = ts.transpileModule(tsCode, {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
      }).outputText;

      const sandbox = {
        exports: {},
        require: (moduleName: string) => {
          if (moduleName === 'mqtt') return mqtt;
          if (moduleName.endsWith('device-mapper')) return {};
          if (moduleName.endsWith('provider-config')) return {};
          if (moduleName.endsWith('model')) return {};
          console.warn(`[MapperLoader] Missing dependency: ${moduleName}`);
          return {};
        },
        console: console
      };

      vm.createContext(sandbox);
      vm.runInContext(jsCode, sandbox);

      const exportedKeys = Object.keys(sandbox.exports);
      if (exportedKeys.length > 0) {
        const MapperClass = (sandbox.exports as any)[exportedKeys[0]];
        if (typeof MapperClass === 'function') {
          console.log(`[MapperLoader] Dynamically loaded mapper: ${exportedKeys[0]}`);
          return { mapper: new MapperClass(config, deviceModelData) };
        }
      }

      return { mapper: null, reason: 'mapper_error', message: 'Mapper 脚本加载失败' };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        return { mapper: null, reason: 'missing_mapper', message: '未找到可用的设备 Mapper' };
      }
      console.error('[MapperLoader] Failed to load mapper or model:', error);
      return { mapper: null, reason: 'mapper_error', message: '加载 Mapper 时发生错误' };
    }
  }
}
