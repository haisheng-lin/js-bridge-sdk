/**
 * 用户发送请求的数据格式
 */
export interface IUserRequest {
  action: string;
  data?: any;
  mode?: 'sync' | 'async';
}

/**
 * 真正发送请求的数据格式
 */
export interface IRequest extends IUserRequest {
  requestId: number;
}

/**
 * 真正获得响应的数据类型
 */
export interface IResponse<T = any> {
  responseId: number;
  status: 'success' | 'error' | 'processing';
  data?: T;
  message?: string;
}

export interface INativeBridge {
  postMessage: (data: string) => void;
}

/**
 * SDK 请求的配置类型
 */
export interface ISDKRequsetConfig {
  params: IUserRequest;
  timeout?: number;
  onProgress?: (response: ISDKResponse) => void;
}

/**
 * SDK 请求的返回类型
 */
export interface ISDKResponse<T = any> extends IResponse<T> {
  config: ISDKRequsetConfig;
}

/**
 * SDK 拦截器管理器
 */
export interface ISDKInterceptorManager<T> {
  use(resolved: IResolvedFn<T>, rejected?: IRejectedFn): number;
  eject(id: number): void;
}

export interface IResolvedFn<T> {
  (val: T): T | Promise<T>;
}

export interface IRejectedFn {
  (error: any): any;
}
