import axios from 'axios';
import * as ts from 'typescript';
import * as vm from 'vm';
import * as mqtt from 'mqtt';
import * as DomainModel from '../domain/model';
import { ProviderConfig } from '../domain/provider-config';
import { DeviceMapper } from './device-mapper';

export class MapperLoader {

  async loadMapper(rawDevice: any, config: ProviderConfig): Promise<DeviceMapper | null> {
    const port = process.env.PORT || 8080;
    const { provider, category, model } = rawDevice;
    const url = `http://localhost:${port}/device-library/mapper?provider=${provider}&category=${category}&deviceModel=${model}`;
    
    try {
      const response = await axios.get(url, { responseType: 'text' });
      const tsCode = response.data;

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
          if (moduleName.endsWith('provider-config')) return {}; // Interface only
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
           return new MapperClass(config);
        }
      }

    } catch (error) {
      console.error('[MapperLoader] Failed to load mapper:', error);
    }

    return null;
  }
}
