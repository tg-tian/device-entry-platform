import type { Device } from '@tgapk/lowcode-common/device';
import { DeviceModel } from './schemas/device-schema';

/**
 * 提供设备实体的持久化读写能力。
 */
export class DeviceDAO {
  /**
   * 查询单个设备。
   * @param deviceId 设备标识。
   * @returns 匹配的设备数据，未找到时返回 undefined。
   */
  async getDevice(deviceId: string): Promise<Device | undefined> {
    const device = await DeviceModel.findOne({ deviceId }).lean();
    return device ? (device as unknown as Device) : undefined;
  }

  /**
   * 保存设备数据，不存在时自动创建。
   * @param device 待保存的设备对象。
   * @returns 保存完成后的 Promise。
   */
  async saveDevice(device: Device): Promise<void> {
    await DeviceModel.findOneAndUpdate(
      { deviceId: device.deviceId },
      device,
      { upsert: true, new: true }
    );
  }

  /**
   * 按补丁更新设备数据。
   * @param deviceId 设备标识。
   * @param patch 待更新的设备字段。
   * @returns 更新完成后的 Promise。
   */
  async updateDevice(deviceId: string, patch: Partial<Device>): Promise<void> {
    await DeviceModel.findOneAndUpdate(
      { deviceId },
      { $set: patch },
      { new: true }
    );
  }

  /**
   * 删除指定设备。
   * @param deviceId 设备标识。
   * @returns 删除完成后的 Promise。
   */
  async deleteDevice(deviceId: string): Promise<void> {
    await DeviceModel.deleteOne({ deviceId });
  }

  /**
   * 查询全部设备。
   * @returns 设备列表。
   */
  async getAllDevices(): Promise<Device[]> {
    const devices = await DeviceModel.find().lean();
    return devices as unknown as Device[];
  }

  /**
   * 按模型标识查询设备。
   * @param modelId 设备模型标识。
   * @returns 设备列表。
   */
  async getDevicesByModelId(modelId: string): Promise<Device[]> {
    const devices = await DeviceModel.find({ 'metaModel.modelId': modelId }).lean();
    return devices as unknown as Device[];
  }
}
