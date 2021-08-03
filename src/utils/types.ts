const toString = Object.prototype.toString;

export function isNumber(value: any): value is number {
  return toString.call(value) === '[object Number]';
}

export function isString(value: any): value is string {
  return toString.call(value) === '[object String]';
}

export function isBoolean(value: any): value is boolean {
  return toString.call(value) === '[object Boolean]';
}

export function isArray(value: any): value is Array<any> {
  return toString.call(value) === '[object Array]';
}

export function isFunction(value: any): value is Function {
  const str = toString.call(value);
  return str === '[object Function]' || str === '[object AsyncFunction]';
}

export function isSymbol(value: any): value is symbol {
  return toString.call(value) === '[object Symbol]';
}

export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

export function isNull(value: any): value is null {
  return value === null;
}

export function isPlainObject(value: any): value is { [s: string]: any } {
  return (
    toString.call(value) == '[object Object]' ||
    // if it isn't a primitive value, then it is a common object
    (!isNumber(value) &&
      !isString(value) &&
      !isBoolean(value) &&
      !isArray(value) &&
      !isNull(value) &&
      !isFunction(value) &&
      !isUndefined(value) &&
      !isSymbol(value))
  );
}
