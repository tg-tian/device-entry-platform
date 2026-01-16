import { DeviceMapper } from './device-mapper';
import { UnifiedEvent } from '../domain/unified-event';

export abstract class IoTAdapter {
  protected eventCallback: (event: UnifiedEvent) => void = () => {};
  public readonly provider: string;

  constructor(provider: string) {
    this.provider = provider;
  }

  abstract init():void;
  //abstract discoverDevices():void;
  //abstract registerDevice(device : any):void;
  abstract sendDeviceCommand(command: any):void;

  setEventHandler(callback: (event: UnifiedEvent) => void): void {
    this.eventCallback = callback;
  }
}
