import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    host.switchToRpc(); // Handles the RPC context, relevant for NATS too
    const rpcError = exception.getError();
    const rpcErrorString = rpcError.toString();

    if (rpcErrorString.includes('Empty response')) {
      return throwError(() => ({
        status: 500,
        message: rpcErrorString.substring(0, rpcErrorString.indexOf('(') - 1),
      }));
    }

    if (typeof rpcError === 'object' && 'status' in rpcError && 'message' in rpcError) {
      const status = isNaN(+rpcError.status) ? 400 : rpcError.status;
      return throwError(() => ({
        status: status,
        message: rpcError.message,
      }));
    }

    return throwError(() => ({
      status: 400,
      message: rpcError,
    }));
  }
}
