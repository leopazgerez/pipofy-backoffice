import { Observable } from 'rxjs';

// Transport-agnostic. Domain/facades never know if it's WS or SSE.
// Reconnect/backoff lives in the concrete implementation, not per-consumer.
export abstract class RealtimeConnection {
  abstract topic<T>(name: string): Observable<T>;
}
