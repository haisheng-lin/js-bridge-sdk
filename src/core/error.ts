import { ISDKRequsetConfig, IResponse } from '../definitions';

class SDKError extends Error {
  public config: ISDKRequsetConfig;
  public response: IResponse;

  constructor(
    message: string,
    config: ISDKRequsetConfig,
    response?: IResponse
  ) {
    super(message);
    this.config = config;
    this.response = response;

    // 为了解决 TypeScript 的一些坑
    // 在继承内置类（这里就是 Error）时候
    // 1. 可能方法会是 undefined
    // 2. instanceof，譬如 (new FooError()) instanceof FooError 为 false
    // 原因应该是这个对象实例的原型没有指向类
    // 所以手动给再赋值一次它的原型，就可以解决问题
    Object.setPrototypeOf(this, SDKError.prototype);
  }
}

export default SDKError;
