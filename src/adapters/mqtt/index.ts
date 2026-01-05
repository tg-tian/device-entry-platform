import mqtt from 'mqtt';
import { IoTAdapter } from '../iot-adapter';
import { ProviderConfig } from '../../domain/provider-config';
import { UnifiedEvent } from '../../domain/unified-event';
import { DeviceMapper} from '../device-mapper';
import { MqttThermostatMapper } from '../mappers/mqtt-thermostat-mapper';
import { MqttACMapper } from '../mappers/mqtt-ac-mapper';

export class MqttAdapter extends IoTAdapter {
  private client: mqtt.MqttClient | undefined;
  private config: ProviderConfig;
  private deviceMappers: Map<string, DeviceMapper | null> = new Map();

  constructor(config: ProviderConfig) {
    super(config.provider);
    this.config = config;
  }

  registerMapper(){
    const t = new MqttThermostatMapper(this.config);
    const a = new MqttACMapper(this.config);
    this.mappers.push(t);
    this.mappers.push(a);
  }

  init(){
    console.log(`[MqttAdapter] Initializing connection to ${this.config.communication.baseUrl}`);
    this.client = mqtt.connect(this.config.communication.baseUrl);
    this.client.on('connect', () => {
      console.log('[MqttAdapter] Connected to MQTT broker');
    });
    this.client.on('error', (err) => {
      console.error('[MqttAdapter] Connection error:', err);
    });
    this.client.on('reconnect', () => {
        console.log('[MqttAdapter] Reconnecting...');
    });
    this.client.removeAllListeners('message');
    const topics = [
      'devices/+/config',
      'devices/+/property',
      'devices/+/events'
    ];
    this.client.subscribe(topics, (err) => {
      if (err) console.error('[MqttAdapter] Subscribe error:', err);
    });
    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
    this.registerMapper();
  }

   private handleMessage(topic: string, payload: Buffer) {
    try {
      const parts = topic.split('/');
      if (parts.length < 3 || parts[0] !== 'devices') {
         console.warn(`[MqttAdapter] Ignored topic format: ${topic}`);
         return;
      }
      const deviceId = parts[1];
      const messageType = parts[2];
      if (messageType === 'config')
        this.discoverDevice(deviceId,payload);
      else if (messageType === 'property')
        this.updateDeviceStates(deviceId,payload);
    } catch (e) {
      console.error('[MqttAdapter] Failed to process message', e);
    }
  }

  discoverDevice(deviceId: string, payload: Buffer){
      const msgStr = payload.toString();
      let raw = JSON.parse(msgStr);
      let selectedMapper = null;
      for (const mapper of this.mappers) {
        if (mapper.match(raw)) {
            selectedMapper = mapper;
            raw = {...raw, isAccessible: true, metaModel: mapper.metaModel};
            this.deviceMappers.set(deviceId, selectedMapper);
            break;
          }
      }
      if (!selectedMapper) 
        raw = {...raw, isAccessible: false};  
      const event: UnifiedEvent = {
        type: "config",
        deviceId: deviceId,
        payload: raw
      };
      this.eventCallback!(event);
  }

  updateDeviceStates(deviceId: string, payload: Buffer){
      const msgStr = payload.toString();
      let raw = JSON.parse(msgStr);
      const mapper = this.deviceMappers.get(deviceId);
      if (!mapper)
        return;
      raw = mapper.mapProperties(raw);
      const event: UnifiedEvent = {
        type: "property",
        deviceId: deviceId,
        payload: raw
      };
      this.eventCallback!(event);
  }

  sendDeviceCommand(command : any){
      const mapper = this.deviceMappers.get(command.deviceId);
      if (!mapper)
        return;
      (mapper as any)[command.action](command.deviceId, command.params);
  }



  
}
