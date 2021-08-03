### JSBridgeSDK

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
