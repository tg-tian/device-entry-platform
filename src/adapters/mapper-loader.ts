import axios from 'axios';
import * as ts from 'typescript';
import * as vm from 'vm';
import * as mqtt from 'mqtt';
import { ProviderConfig } from '../domain/provider-config';
import { DeviceMapper } from './device-mapper';

import { BaseDeviceModel } from '../domain/model';

export class MapperLoader {

  async loadMapper(rawDevice: any, config: ProviderConfig): Promise<DeviceMapper | null> {
    const url = process.env.MAPPER_LOADER_URL;
    const { provider, model } = rawDevice;
    const mapperUrl = `${url}/device-library/mapper?provider=${provider}&deviceModel=${model}`;
    
    try {

      const mapperResponse = await axios.get(mapperUrl, { responseType: 'json' });
      const { content, deviceTypeName } = mapperResponse.data;

      if (!content || !deviceTypeName) {
        console.error('[MapperLoader] Invalid mapper response:', mapperResponse.data);
        return null;
      }

      const modelUrl = `${url}/meta/v1/device-types/model/${deviceTypeName}`;
      const modelResponse = await axios.get(modelUrl, { responseType: 'json' });

      const tsCode = content;
      const deviceModel: BaseDeviceModel = modelResponse.data.model;

      if (!tsCode) return null;

      const jsCode = ts.transpileModule(tsCode, {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
      }).outputText;

      // 3. Prepare Sandbox for Dynamic Execution
      const sandbox = {
        exports: {},
        require: (moduleName: string) => {
          if (moduleName === 'mqtt') return mqtt;
          if (moduleName.endsWith('device-mapper')) return {}; // Interface only
          if (moduleName.endsWith('provider-config')) return {};
          if (moduleName.endsWith('model')) return {};
          console.warn(`[MapperLoader] Missing dependency: ${moduleName}`);
          return {};
        },
        console: console
      };

      // 4. Execute Code in VM
      vm.createContext(sandbox);
      vm.runInContext(jsCode, sandbox);

      // 5. Extract the exported class
      // The mapper file exports a class, e.g., "export class MqttACMapper ..."
      // In CommonJS: exports.MqttACMapper = ...
      const exportedKeys = Object.keys(sandbox.exports);
      if (exportedKeys.length > 0) {
        const MapperClass = (sandbox.exports as any)[exportedKeys[0]];
        if (typeof MapperClass === 'function') {
           console.log(`[MapperLoader] Dynamically loaded mapper: ${exportedKeys[0]}`);
           return new MapperClass(config, deviceModel);
        }
      }

    } catch (error) {
      console.error('[MapperLoader] Failed to load mapper or model:', error);
    }

    return null;
  }
}
