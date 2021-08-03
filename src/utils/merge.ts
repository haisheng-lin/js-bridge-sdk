import { isPlainObject, isNull, isUndefined } from './types';

export default function merge(val1: any, val2: any) {
  if (isNull(val1) || isUndefined(val1)) {
    // 如果 val1 为空，则使用 val2
    return val2;
  } else if (isPlainObject(val1) && isPlainObject(val2)) {
    // val1 与 val2 都为对象
    const result = {};
    const keys = [...Object.keys(val1), ...Object.keys(val2)];
    for (const key of keys) {
      result[key] = merge(val1[key], val2[key]);
    }

    return result;
  } else {
    return val1;
  }
}
