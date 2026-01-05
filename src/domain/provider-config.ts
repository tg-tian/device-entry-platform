export interface ProviderConfig {
  provider: string;
  communication: {
    protocol: string;
    baseUrl: string;
    webhook?: {
      enabled: boolean;
      path: string;
    };
    topics?: {
      telemetry: string;
      event?: string;
      command?: string;
      config?: string;
    };
  };
  auth?: {
    type: string;
    ak?: string;
    sk?: string;
    token?: string;
    [key: string]: any;
  };
}
