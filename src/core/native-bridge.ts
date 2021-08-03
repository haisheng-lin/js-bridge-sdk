import { isIOS, isAndroid } from '../utils/ua';
import { serialize } from '../utils/serialization';
import { INativeBridge, IRequest, IResponse } from '../definitions';

declare global {
  interface Window {
    nativeBridge: INativeBridge;
    webkit: {
      messageHandlers: {
        nativeBridge: INativeBridge;
      };
    };
  }
}

class NativeBridge {
  private nativeBridge: INativeBridge;

  constructor() {
    if (isIOS) {
      this.nativeBridge = window?.webkit?.messageHandlers?.nativeBridge;
    } else if (isAndroid) {
      this.nativeBridge = window?.nativeBridge;
    }
  }

  /**
   * 向客户端发送消息
   */
  postMessage<T>(data: IRequest | IResponse<T>) {
    if (!this.nativeBridge) {
      throw new Error('cannot find native bridge on window');
    }
    const message = serialize(data);
    this.nativeBridge?.postMessage(message);
  }
}

export default NativeBridge;
