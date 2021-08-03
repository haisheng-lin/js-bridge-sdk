import NativeBridge from './native-bridge';
import { isRequestMessage } from '../utils';
import { deserialize } from '../utils/serialization';
import { IUserRequest, IRequest, IResponse } from '../definitions';

class JSBridge {
  private nativeBridge: NativeBridge;
  private requestId: number;
  // 存储 web 向 native 发送请求的回调
  private requestCallbacks: { [requestId: number]: (data: IResponse) => void };
  // 存储常驻回调，以 action 作为标识映射
  private registeredCallbacks: {
    [action: string]: ((data: IRequest) => Promise<any>)[];
  };

  constructor() {
    this.nativeBridge = new NativeBridge();
    this.requestId = 1;
    this.requestCallbacks = {};
    this.registeredCallbacks = {};
  }

  /**
   * 触发 web 向 native 发送消息
   */
  invoke<T = any>(data: IUserRequest, callback: (data: IResponse<T>) => void) {
    this.requestId++;
    this.requestCallbacks[this.requestId] = callback;
    this.postMessageToNative({ ...data, requestId: this.requestId });
  }

  /**
   * 注册常驻回调 
   */
  register(action: string, callback: (data: IRequest) => Promise<any>) {
    this.registeredCallbacks[action] = this.registeredCallbacks[action] || [];
    this.registeredCallbacks[action].push(callback);
  }

  /**
   * 注册常驻回调 
   */
  unregister(action: string, callback: (data: IRequest) => Promise<any>) {
    const callbacks = this.registeredCallbacks[action];
    if (!callbacks) {
      return;
    }

    this.registeredCallbacks[action] = callbacks.filter(
      (cb) => cb !== callback
    );
  }

  /**
   * native 向 web 发送消息
   */
  postMessage<T = any>(message: string) {
    const data = deserialize(message, {}) as IRequest | IResponse<T>;
    if (isRequestMessage(data)) {
      this.processRequest(data);
    } else {
      this.processResponse(data);
    }
  }

  /**
   * 向 native 端发送消息
   */
  postMessageToNative<T = any>(data: IRequest | IResponse<T>) {
    this.nativeBridge?.postMessage(data);
  }

  /**
   * 处理 native 端请求
   */
  private processRequest(request: IRequest) {
    const { requestId, action } = request;
    const callbacks = this.registeredCallbacks[action];

    if (!callbacks || !callbacks.length) {
      this.postMessageToNative({
        responseId: requestId,
        status: 'error',
        message: `no callback is registered for action: ${action}`,
      });
      return;
    }

    callbacks.forEach(async (callback) => {
      try {
        const responseData = await callback(request);
        this.postMessageToNative({
          responseId: requestId,
          status: 'success',
          data: responseData,
        });
      } catch (error) {
        this.postMessageToNative({
          responseId: requestId,
          status: 'error',
          data: error,
        });
      }
    });
  }

  /**
   * 处理 native 端响应
   */
  private processResponse<T = any>(response: IResponse<T>) {
    const responseId = response.responseId;
    const callback = this.requestCallbacks[responseId];
    callback(response);
    if (response.status !== 'processing') {
      delete this.requestCallbacks[responseId];
    }
  }
}

export default JSBridge;
