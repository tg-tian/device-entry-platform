import { Device } from '../domain/device';
import { DeviceModel } from './schemas/device-schema';

export class DeviceDAO {
  async getDevice(deviceId: string): Promise<Device | undefined> {
    const device = await DeviceModel.findOne({ deviceId }).lean();
    return device ? (device as unknown as Device) : undefined;
  }

  async saveDevice(device: Device): Promise<void> {
    await DeviceModel.findOneAndUpdate(
      { deviceId: device.deviceId },
      device,
      { upsert: true, new: true }
    );
  }

  async updateDevice(deviceId: string, patch: Partial<Device>): Promise<void> {
    await DeviceModel.findOneAndUpdate(
      { deviceId },
      { $set: patch },
      { new: true }
    );
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await DeviceModel.deleteOne({ deviceId });
  }

  async getAllDevices(): Promise<Device[]> {
    const devices = await DeviceModel.find().lean();
    return devices as unknown as Device[];
  }
}
