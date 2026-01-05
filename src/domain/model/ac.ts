import { BaseDeviceModel } from './base-model';

export const ACModel: BaseDeviceModel = {
  modelName: 'AC',
  provider: 'template',
  category: 'ac',
  properties: {
    tempCurrent: { type: 'number', unit: 'C', min: -20, max: 60 },
    tempTarget: { type: 'number', unit: 'C', min: 16, max: 30 },
    hvacMode: { type: 'enum', enumValues: ['cool', 'heat', 'fan', 'dry', 'auto'] }
  },
  actions: {
    setMode: { arguments: { mode: { type: 'enum', enumValues: ['cool', 'heat', 'fan', 'dry', 'auto'] } } },
    setTemperature: { arguments: { temp: { type: 'number', min: 16, max: 30 } } },
  },
  events: {},
  extensions: {}
};
