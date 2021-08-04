import JSBridge from './js-bridge';
import InterceptorManager from './interceptor-manager';
import SDKError from './error';
import merge from '../utils/merge';
import {
  ISDKRequsetConfig,
  ISDKResponse,
  IRequest,
  IResponse,
  IResolvedFn,
  IRejectedFn,
} from '../definitions';

declare global {
  interface Window {
    jsBridge: JSBridge;
  }
}

interface IInterceptors {
  request: InterceptorManager<ISDKRequsetConfig>;
  response: InterceptorManager<ISDKResponse>;
}

interface IPromiseChain<T> {
  resolved: IResolvedFn<T> | ((config: T) => Promise<T>);
  rejected?: IRejectedFn;
}

class SDK {
  private jsBridge: JSBridge;
  private timers: { [timer: number]: number };

  public defaults: ISDKRequsetConfig;
  public interceptors: IInterceptors;

  constructor(initConfig: ISDKRequsetConfig) {
    const jsBridge = new JSBridge();
    this.jsBridge = jsBridge;
    this.timers = {};
    this.defaults = initConfig;
    this.interceptors = {
      request: new InterceptorManager<ISDKRequsetConfig>(),
      response: new InterceptorManager<ISDKResponse>(),
    };
    // 挂载 js bridge 到 window 特定空间上
    window.jsBridge = jsBridge;
  }

  request<T = any>(
    config: ISDKRequsetConfig
  ): Promise<ISDKResponse<T> | undefined> {
    config = merge(config, this.defaults);

    switch (config.params?.mode) {
      case 'sync': {
        const chain: IPromiseChain<any>[] = [
          { resolved: this.dispatchSyncRequest },
        ];
        this.interceptors.request.forEach((interceptor) => {
          chain.unshift(interceptor);
        });

        const promise: Promise<any> = chain.reduce(
          (prev, { resolved, rejected }) => prev.then(resolved, rejected),
          Promise.resolve(config)
        );

        return promise;
      }
      case 'async': {
        const chain: IPromiseChain<any>[] = [
          { resolved: this.dispatchAsyncRequest },
        ];
        this.interceptors.request.forEach((interceptor) => {
          // request 拦截器是先添加后执行
          chain.unshift(interceptor);
        });

        this.interceptors.response.forEach((interceptor) => {
          // response 拦截器是先添加先执行
          chain.push(interceptor);
        });

        const promise: Promise<any> = chain.reduce(
          (prev, { resolved, rejected }) => prev.then(resolved, rejected),
          Promise.resolve(config)
        );

        return promise;
      }
    }
  }

  /**
   * 向 JSBridge 注册常驻回调
   */
  register(action: string, callback: (data: IRequest) => Promise<any>) {
    this.jsBridge.register(action, callback);
  }

  /**
   * 向 JSBridge 注销常驻回调
   */
  unregister(action: string, callback: (data: IRequest) => Promise<any>) {
    this.jsBridge.unregister(action, callback);
  }

  destroy() {
    Object.keys(this.timers).forEach((timer) => {
      clearTimeout(Number(timer));
    });
    this.timers = {};
  }

  private dispatchSyncRequest(config: ISDKRequsetConfig) {
    return new Promise<undefined>((resolve) => {
      this.jsBridge.invoke(config.params);
      resolve(undefined);
    });
  }

  private dispatchAsyncRequest<T>(config: ISDKRequsetConfig) {
    const { params, timeout } = config;
    return new Promise<ISDKResponse<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        delete this.timers[timer];
        reject(new SDKError(`timeout of ${timeout}ms exceeded`, config));
      }, timeout);

      this.timers[timer] = timer;

      this.jsBridge.invoke(params, (response: IResponse<T>) => {
        clearTimeout(timer);
        delete this.timers[timer];
        switch (response.status) {
          case 'success': {
            resolve({ ...response, config });
            break;
          }
          case 'processing': {
            config.onProgress?.({ ...response, config });
            break;
          }
          case 'error': {
            reject(new SDKError(response.message, config, response));
          }
        }
      });
    });
  }
}

export default SDK;
