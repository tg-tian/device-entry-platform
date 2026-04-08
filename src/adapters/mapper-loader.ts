import axios from 'axios';
import * as ts from 'typescript';
import * as vm from 'vm';
import * as mqtt from 'mqtt';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import { DeviceMapper } from './device-mapper';
import type { BaseDeviceModel } from '@tgapk/lowcode-common/device-model';

/**
 * 从远端服务加载并实例化设备映射器。
 */
export class MapperLoader {
  /**
   * 按设备信息与供应商配置加载映射器。
   * @param rawDevice 设备原始配置数据。
   * @param config 供应商接入配置。
   * @returns 成功时返回映射器实例，否则返回 null。
   */
  async loadMapper(rawDevice: any, config: ProviderConfig): Promise<DeviceMapper | null> {
    const url = process.env.MAPPER_LOADER_URL;
    const { provider, deviceModel } = rawDevice;
    const mapperUrl = `${url}/device/mapper?provider=${provider}&deviceId=${deviceModel}`;

    try {
      const mapperResponse = await axios.get(mapperUrl, { responseType: 'json' });
      const { content, modelId } = mapperResponse.data;

      if (!content || !modelId) {
        console.error('[MapperLoader] Invalid mapper response:', mapperResponse.data);
        return null;
      }

      const modelUrl = `${url}/meta/device-models/${modelId}`;
      const modelResponse = await axios.get(modelUrl, { responseType: 'json' });
      const tsCode = content;
      const deviceModelData: BaseDeviceModel = modelResponse.data.model;

      if (!tsCode) return null;

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
          return new MapperClass(config, deviceModelData);
        }
      }
    } catch (error) {
      console.error('[MapperLoader] Failed to load mapper or model:', error);
    }

    return null;
  }
}
