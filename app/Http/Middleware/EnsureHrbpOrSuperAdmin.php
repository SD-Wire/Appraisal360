<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHrbpOrSuperAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_if(! $user, 403, 'Unauthorized.');

        $isAuthorized = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || (method_exists($user, 'isHrbp') && $user->isHrbp())
            || $user->hasRole('Super Admin')
            || $user->hasRole('HR Business Partner');

        abort_unless($isAuthorized, 403, 'This report is restricted to HRBP and Super Admin only.');

        return $next($request);
    }
}
