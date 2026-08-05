import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// Central logging point. Mapping to DomainError happens in the repository (Task 4),
// so this only observes + rethrows — it does not swallow errors.
export const errorLogInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((err) => {
    console.error('[http]', req.method, req.url, err?.status);
    return throwError(() => err);
  }));
