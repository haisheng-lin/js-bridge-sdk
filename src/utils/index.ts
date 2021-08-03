import { IRequest, IResponse } from '../definitions';

export function isRequestMessage<T>(
  data: IRequest | IResponse<T>
): data is IRequest {
  return (data as any).requestId !== undefined;
}
