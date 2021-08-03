export function serialize(data: any) {
  return JSON.stringify(data);
}

export function deserialize<T = any>(data: string, defaultValue?: T) {
  try {
    const result = JSON.parse(data);
    return result as T;
  } catch (e) {
    return defaultValue;
  }
}
