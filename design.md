## 前言

在如今移动端盛行的年代，技术选型上基本都是混合开发（Hybrid），混合开发是一种开发模式，指使用多种开发模型开发 App，通常会涉及到两大类技术：原生 Native、Web。

原生技术主要指 iOS（Objective C）、Android（Java），原生开发效率较低，开发完成需要重新打包整个 App，发布依赖用户的更新，性能较高功能覆盖率更高。

Web 主要由 HTML、CSS、JavaScript 组成，Web 可以更好的实现发布更新，跨平台也更加优秀，但性能较低，特性也受限。

混合开发的意义就在于吸取两者的优点，而且随着手机硬件的升级迭代、系统（Android 5.0+、iOS 9.0+）对于 Web 特性的较好支持，web 的劣势被逐渐缩小。

既然有原生与 web 两端，那么就会涉及到两端之间的通信，它们之间的通信方案就是 JSBridge。通过 JSBridge，Web 端可以调用 Native 端的接口，同样 Native 端也可以通过 JSBridge 调用 Web 端的接口，实现彼此的双向调用。

业界里实现的通信方案多种多样，但是它们之所以能实现都是有一个前提：**客户端拥有对 WebView 注入方法以及调用方法的能力**。一方面，客户端可实现一个允许外界向自身通信的接口，注入到 WebView，web 通过调用该方法即可向客户端通信；另一方面，web 也要实现一个外界与自身通信的接口并挂载到 WebView 下，客户端调用该方法即可与 Web 通信。这样下来，双方互相通信是所有 JSBridge 实现的前提。

## JSBridgeSDK 设计

![bridge-overview.png](https://cdn.nlark.com/yuque/0/2023/png/328459/1675131047185-4f59ebb5-3208-4581-a380-7e058419f6b8.png)

### Bridge

Bridge 是双方底层通信的桥梁，相当于用于网络通信的 XMLHttpRequest。

- NativeBridge: web 端向客户端发送消息的桥梁，客户端应向 WebView 注入 NativeBridge 以供 web 端使用
- JSBridge:  客户端向 web 端发送消息的桥梁，web 端应挂载 JSBridge 以供客户端使用

#### 基本通信（请求与响应）

Bridge 最基本功能是提供客户端与 WebView 之间的通信桥梁。通信可分为同步通信与异步通信，同步通信在发送消息给对方后无需得到响应，而异步通信相反，类比 TCP 与 UDP。对于异步通信，包括了请求与响应两步，我们应当如何关联起这两者？答案是通信 id。发送请求与响应时都应带上请求 id 与响应 id，只有它们一样，才能关联起两者，并且每次通信时的请求 id 与响应 id 都是唯一的。

![bridge-connection.png](https://cdn.nlark.com/yuque/__puml/cef55d87dbe22908d20e849c74cf3674.svg)

方案设计：NativeBridge 与 JSBridge 均提供 `postMessage` 方法，用于发送消息。

入参均为 JSON 字符串，其格式应固定如下：

```JavaScript
{
  // 必填，number，本次请求 id
  requestId: 1,

  // 必填，string，需要触发的事件
  action: 'getUserProfile',

  // 非必填，string
  // 选项有 'sync' | 'async' | 'progress'，默认 'sync'
  // 分别标识当前请求是同步、异步、进度类型
  mode: 'async',

  // 非必填，类型随意，请求携带的业务入参
  data: { userId: 1 },
}
```

出参同样均为 JSON 字符串，其格式应固定如下：

```JavaScript
{
  // 必填，number，本次响应 id
  responseId: 1,

  // 必填，string，响应状态
  // 选项有 'success' | 'error' | 'processing'
  // 分别是成功、失败、进行中（用于进度类请求）
  status: 'success',

  // 非必填，string，响应的备注说明
  message: '',

  // 非必填，类型随意，请求携带的业务入参
  data: { userId: 1 },
}
```

#### 注册（销毁）事件与回调

客户端可通过 Bridge 注册事件与回调，注册后往 WebView 派发该事件，该事件对应的回调队列会一一执行并将结果返回。后面我们称事件为 **action**。

![bridge-action.png](https://cdn.nlark.com/yuque/__puml/5cbd21ac90ffca71b5276b1a305f8216.svg)

方案设计：JSBridge 应维护一个 action 与任务队列映射的数据结构，每注册一个 action 回调时，都将回调添加到 action 对应的任务队列中。实现 `register` 与 `unregister` 方法。它们的入参如下:

```JavaScript
{
  // 必填，string
  action: 'getUserProfile',

  // 必填，function
  callback: () => {},
}
```

以下是一个调用例子：

```JavaScript
function getUserProfile(request) {
  // request 为下次 postMessage(data) 的入参 data
}

jsBridge.register('getUserProfile', getUserProfile);
jsBridge.unregister('getUserProfile', getUserProfile);
```

#### 往上层提供调用 api

方案设计：JSBridge 应提供 `invoke` 方法，用于 web 端向客户端发送消息的场景，这是提供给更上层调用而非客户端直接调用。

入参列表如下：

| 参数        | 类型             | 说明                                                |
| ----------- | ---------------- | --------------------------------------------------- |
| data        | any              | 必填，格式参考 postMessage 入参，但无需 `requestId` |
| callback    | Function         | 必填，要注册的回调                                  |

使用例子：

```TypeScript
jsBridge.invoke({ action: 'getUserProfile' }, (response) => {
  console.log(response);
});
```

### SDK

Bridge 提供底层通信方案，但其 api 对业务层来说不是很友好，直接调用不是好的选择，所以需要再封装一层 SDK，对业务层提供友好的 api。如果说 Bridge 类似于 XMLHttpRequest，那么 SDK 就好比 axios。参考 axios，该 SDK 也提供如下功能：

- 封装友好的 request api
- 异步请求异常处理，返回足够的错误信息
- 为异步请求提供超时配置
- 允许设置全局默认配置
- 提供拦截器功能，包括请求拦截器、响应拦截器
- 提供进度类功能
- 提供取消异步请求的方法（暂未实现）

#### request 方法

入参格式定义如下：

```JavaScript
{
  // 必填，格式参考 postMessage 入参，但无需 requestId
  params: {
    action: 'getUserProfile',
    mode: 'async',
    data: { userId: 1 },
  },

  // 非必填，异步请求超时设置，单位毫秒，默认 10000
  timeout: 5000,
}
```

出参格式定义如下（与 postMessage 出参相同，仅增加 config 字段）：

```JavaScript
{
  // 必填，number，本次响应 id
  responseId: 1,

  // 必填，string，响应状态
  // 选项有 'success' | 'error' | 'processing'
  // 分别是成功、失败、进行中（用于进度类请求）
  status: 'success',

  // 必填，请求 requestConfig，格式参考入参配置
  config: {
    params: { action: 'getUserProfile' },
    timeout: 10000,
  },

  // 非必填，string，响应的备注说明
  message: '',

  // 非必填，类型随意，请求携带的业务入参
  data: { userId: 1 },
}
```

异步请求异常时错误格式如下：

```JavaScript
{
  // 必填，请求 requestConfig，格式参考入参配置
  config: {
    params: { action: 'getUserProfile' },
    timeout: 10000,
  },

  // 必填，string，响应的备注说明
  message: '',

  // 非必填，格式参考 postMessage 出参，请求携带的业务出参
  // 如果超时或取消请求，则该字段为 undefined
  response: {
    responseId: 1,
    status: 'error',
    data: null,
  },
}
```

使用示例：

```TypeScript
interface UserProfile {
  id: number;
  name: string;
  avatar: string;
}

sdk
  .request<UserProfile>({
    params: {
      action: 'getUserProfile',
      data: { userId: '1' },
      mode: 'async',
    },
  })
  .then((response) => {
    const avatar = response.data?.avatar;
    console.log(avatar);
  })
  .catch(error => {
    console.log(error.message);
    console.log(error.response);
  });
```

#### register 与 unregister 方法

为 web 用户提供注册与注销常驻回调，调用方式与入参均与上述 JSBridge 的一致。

#### 为异步请求提供超时配置

注意：**超时配置仅对非同步请求有效**。使用示例：

```TypeScript
sdk.request({
  params: {
    action: 'getUserProfile',
    data: { userId: '1' },
    mode: 'async',
  },
  timeout: 10000, // 设置超时限制 10s
});
```

#### 允许设置全局默认配置

```TypeScript
// 设置默认异步请求超时限制为 9s
sdk.defaults.timeout = 9000;
```

#### 拦截器

与 axios 一样提供请求拦截器与响应拦截器，每个拦截器均以上游返回的结果作为入参，自身处理过后的参数为出参（也是下一个拦截器的入参）。请求拦截器：先加后执行；响应拦截器：先加先执行。注意：**响应拦截器仅对非同步请求有效**。

使用示例：

```TypeScript
// 请求拦截器里为参数增加 userId 作为当前登录标识
sdk.interceptors.request.use((config) => {
  config.params.data.userId = '1234';
  return config;
});

// 请求拦截器里为参数进行加密
sdk.interceptors.request.use((config) => {
  config.params.data = encrypt(config.params.data);
  return config;
});

// 响应拦截器为每个响应都插入当前时间戳
sdk.interceptors.response.use((response) => {
  response.data.timestamp = Date.now();
  return response;
});
```

#### 进度类

在 request config 增加配置参数 `onProgress`，若响应 status 为 `processing` 则触发该方法，入参为响应数据。

```TypeScript
sdk.request({
  params: {
    action: 'uploadUserAvatar',
    mode: 'async',
  },
  onProgress: (response) => {},
});
```

#### 总结

总的来说，该 SDK 提供的接口格式及参数等都跟 axios 相差不大，虽然底层的通信方案与之不同，但面向上层则抹平了这层差异，提供统一的调用方式，降低接入学习成本。

## 资料

摘自：https://www.yuque.com/haishenglin/avkfhs/ilangmng7flxyvwy
