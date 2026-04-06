import mqtt from 'mqtt';
import { DeviceMapper } from '../device-mapper';
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config';
import type { BaseDeviceModel } from '@tgapk/lowcode-common/device-model';

export class MqttCoffeeMakerMapper implements DeviceMapper {
  metaModel: BaseDeviceModel;
  deviceModel = 'DELONGHI-CF-2001';
  provider = 'mqtt';
  private client: mqtt.MqttClient;
  private cfg: ProviderConfig;

  propertyMap: Record<string, any> = {
    water_temperature: 'waterTemperature',
    water_level: 'waterLevel',
    status: 'status'
  };

  eventMap: Record<string, any> = {
    coffeeComplete: {
      _to: 'coffeeComplete',
      coffee_type: 'coffee_type',
      duration: 'duration',
      start_time: 'start_time'
    }
  };

  constructor(config: ProviderConfig, metaModel: BaseDeviceModel) {
    this.cfg = config;
    this.metaModel = metaModel;
    this.client = mqtt.connect(this.cfg.communication.baseUrl);
  }

  private isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private hasNestedMapping(mapping: any): boolean {
    return Object.keys(mapping).some(key => !key.startsWith('_'));
  }

  private processMapping(sourceData: any, mapping: any): Record<string, any> {
    const mappedData: Record<string, any> = {};
    if (!this.isPlainObject(sourceData) || !this.isPlainObject(mapping)) {
      return mappedData;
    }
    for (const [key, value] of Object.entries(sourceData)) {
      const fieldMapping = mapping[key];
      if (!fieldMapping) {
        mappedData[key] = value;
        continue;
      }
      if (typeof fieldMapping === 'string') {
        mappedData[fieldMapping] = value;
        continue;
      }
      if (!this.isPlainObject(fieldMapping)) {
        mappedData[key] = value;
        continue;
      }
      const targetKey = fieldMapping._to || key;
      if (fieldMapping._map) {
        mappedData[targetKey] = fieldMapping._map[value as any] ?? value;
        continue;
      }
      if (this.isPlainObject(value) && this.hasNestedMapping(fieldMapping)) {
        mappedData[targetKey] = this.processMapping(value, fieldMapping);
      } else {
        mappedData[targetKey] = value;
      }
    }
    return mappedData;
  }

  mapProperties(rawProps: any): Record<string, any> {
    return this.processMapping(rawProps, this.propertyMap);
  }

  mapEvents(rawEvent: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawEvent)) {
      if (this.eventMap[key]) {
        const mapping = this.eventMap[key];
        const targetEventName = mapping._to || key;
        result[targetEventName] = this.processMapping(value, mapping);
      }
    }
    return result;
  }

  makeCoffee(deviceId: string, args: any): void {
    const payload = {
      action: 'makeCoffee',
      args: {
        coffee_type: args.coffee_type
      }
    };
    this.client.publish(`devices/${deviceId}/command`, JSON.stringify(payload));
  }
}
