import { ISDKRequsetConfig } from './definitions';

export const defaultSDKRequestConfig: ISDKRequsetConfig = {
  params: {
    action: '',
    mode: 'sync'
  },
  timeout: 5000,
};
