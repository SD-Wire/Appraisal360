<?php

namespace App\Http\Middleware;

use App\Models\Region;
use App\Models\Team;
use App\Support\PermissionsTeam;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        [$globalRoles, $globalPermissions] =
            $this->resolveGlobalRolesAndPermissions($user);

        $teamPermissions = collect();

        if ($user) {
            // Make sure Spatie is using the user's current team.
            app(PermissionRegistrar::class)
                ->setPermissionsTeamId($user->currentTeam?->id);

            $user->unsetRelation('roles');
            $user->unsetRelation('permissions');

            $teamPermissions = $user
                ->getAllPermissions()
                ->pluck('name');
        }

        $allPermissions = $user?->isSuperAdmin()
            ? Permission::pluck('name')
            : $teamPermissions->merge($globalPermissions)->unique()->values();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'roles' => collect($user?->getRoleNames() ?? [])
                    ->merge($globalRoles)
                    ->unique()
                    ->values(),
                'permissions' => $allPermissions,
                'canManageTeams' => $user?->isSuperAdmin() ?? false,
            ],
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
                'generated_key' => fn() => $request->session()->get('generated_key'),
            ],
            'sidebarOpen' =>
                !$request->hasCookie('sidebar_state') ||
                $request->cookie('sidebar_state') === 'true',
            'currentTeam' => fn() =>
                $user?->currentTeam
                    ? $user->toUserTeam($user->currentTeam)
                    : null,
            'teams' => $user?->visibleTeams(includeCurrent: true) ?? [],
            'teamCreationContext' => fn () => $user?->isSuperAdmin()
                ? [
                    'regions' => Region::orderBy('name')->get(['id', 'name', 'code']),
                    'hqTeam' => ($hq = Team::where('type', 'hq')->first(['id', 'name', 'slug']))
                        ? [
                            'id' => $hq->id,
                            'name' => $hq->name,
                            'slug' => $hq->slug,
                        ]
                        : null,
                ]
                : null,
        ];
    }

    /**
     * Resolve the user's globally-scoped roles/permissions (assigned under
     * the reserved PermissionsTeam::GLOBAL sentinel), independent of
     * whatever team context is currently active. Spatie's model_has_roles
     * / model_has_permissions tables have a NOT NULL team_id as part of
     * their primary key, so a true "no team" assignment doesn't exist —
     * global roles (Super Admin, HR Business Partner) live under that
     * sentinel instead, and this reads them without disturbing the
     * caller's active team-scoped roles relation.
     *
     * @return array{0: \Illuminate\Support\Collection<int, string>, 1: \Illuminate\Support\Collection<int, string>}
     */
    private function resolveGlobalRolesAndPermissions($user): array
    {
        if (!$user) {
            return [collect(), collect()];
        }

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $user->unsetRelation('roles');

        $globalRoles = $user->getRoleNames();
        $globalPermissions = $user->getAllPermissions()->pluck('name');

        $user->unsetRelation('roles');  // don't leak the sentinel-context cache back to the caller
        $registrar->setPermissionsTeamId($previousTeamId);

        return [$globalRoles, $globalPermissions];
    }
}
