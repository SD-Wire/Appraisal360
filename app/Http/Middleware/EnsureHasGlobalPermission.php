<?php

namespace App\Http\Middleware;

use App\Support\PermissionsTeam;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;
use Closure;

class EnsureHasGlobalPermission
{
    /**
     * Check a permission under BOTH the reserved global sentinel context
     * and the user's current real team context, since a permission like
     * roles.manage might be granted globally (Super Admin) or, in future,
     * to a team-scoped role — a bare `can:` middleware only ever checks
     * whichever context happens to be active when the request runs.
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        abort_if(!$user, 403);

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $user->unsetRelation('permissions');
        $hasGlobally = $user->can($permission);
        $user->unsetRelation('permissions');

        $registrar->setPermissionsTeamId($previousTeamId);
        $user->unsetRelation('permissions');
        $hasInCurrentTeam = $user->can($permission);
        $user->unsetRelation('permissions');

        $registrar->setPermissionsTeamId($previousTeamId);

        abort_unless($hasGlobally || $hasInCurrentTeam, 403);

        return $next($request);
    }
}
