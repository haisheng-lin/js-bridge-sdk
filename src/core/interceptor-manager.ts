import { IResolvedFn, IRejectedFn } from '../definitions';

interface IInterceptor<T> {
  resolved: IResolvedFn<T>;
  rejected?: IRejectedFn;
}

export default class InterceptorManager<T> {
  private interceptors: Array<IInterceptor<T> | null>;

  constructor() {
    this.interceptors = [];
  }

  use(resolved: IResolvedFn<T>, rejected?: IRejectedFn) {
    this.interceptors.push({ resolved, rejected });
    return this.interceptors.length - 1;
  }

  eject(id: number) {
    if (this.interceptors[id]) {
      this.interceptors[id] = null;
    }
  }

  forEach(fn: (interceptor: IInterceptor<T>) => void) {
    this.interceptors.forEach((interceptor) => {
      if (interceptor) {
        fn(interceptor);
      }
    });
  }
}
