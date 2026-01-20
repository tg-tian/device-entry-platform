import { BaseDeviceModel } from './base-model';

export const ThermostatModel: BaseDeviceModel = {
  modelName: 'Thermostat',
  provider: 'template',
  category: 'thermometer',
  properties: {
    tempCurrent: { type: 'number', unit: 'C' },
  },
  events: {
    overheating: { level: 'warning', fields: { level: { type: 'string' } } }
  },
  extensions: {}
};
