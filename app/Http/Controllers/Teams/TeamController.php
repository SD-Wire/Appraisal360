<?php

namespace App\Http\Controllers\Teams;

use App\Actions\Teams\CreateTeam;
use App\Enums\TeamRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Teams\DeleteTeamRequest;
use App\Http\Requests\Teams\SaveTeamRequest;
use App\Models\Department;
use App\Models\Membership;
use App\Models\Team;
use App\Models\User;
use App\Support\TeamRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;

class TeamController extends Controller
{
    private function assertSuperAdmin(Request $request): void
    {
        abort_unless($request->user()->isSuperAdmin(), 403, __('Only a Super Admin can manage teams.'));
    }

    /**
     * Display a listing of the user's teams.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('teams/index', [
            'teams' => $user->visibleTeams(includeCurrent: true),
            'canManageTeams' => $user->isSuperAdmin(),
        ]);
    }

    /**
     * Store a newly created team.
     */
    public function store(SaveTeamRequest $request, CreateTeam $createTeam): RedirectResponse
    {
        $this->assertSuperAdmin($request);

        $team = $createTeam->handle(
            user: $request->user(),
            name: $request->validated('name'),
            type: 'branch',
            regionId: (int) $request->validated('region_id'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Branch created.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Show the team edit page.
     */
    public function edit(Request $request, Team $team): Response
    {
        $user = $request->user();
        app(PermissionRegistrar::class)->setPermissionsTeamId($team->id);

        // Eager-load region for region/branch-type teams.
        if (in_array($team->type, ['region', 'branch'])) {
            $team->load('region');
        }

        return Inertia::render('teams/edit', [
            'team' => [
                'id'         => $team->id,
                'name'       => $team->name,
                'slug'       => $team->slug,
                'isPersonal' => $team->is_personal,
                'type'       => $team->type,
                'region'     => $team->region ? [
                    'id'   => $team->region->id,
                    'name' => $team->region->name,
                    'code' => $team->region->code,
                ] : null,
            ],
            'members' => $team
                ->members()
                ->with(['department:id,name', 'roles'])
                ->withPivot('role', 'suspended_at')
                ->get()
                ->map(function (User $member) {
                    /** @var Membership $membership */
                    $membership = $member->getRelation('pivot');

                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'avatar' => $member->avatar ?? null,
                        'role' => $membership->role->value,
                        'role_label' => $membership->role->label(),
                        'org_role' => $member->roles->pluck('name')->first(),
                        'department' => $member->department?->name,
                        'department_id' => $member->department_id,
                        'suspended' => $membership->suspended_at !== null,
                    ];
                }),
            'invitations' => $team
                ->invitations()
                ->whereNull('accepted_at')
                ->with('department:id,name')
                ->get()
                ->map(fn($invitation) => [
                    'code' => $invitation->code,
                    'email' => $invitation->email,
                    'role' => $invitation->role->value,
                    'role_label' => $invitation->role->label(),
                    'org_role' => $invitation->org_role,
                    'department' => $invitation->department?->name,
                    'created_at' => $invitation->created_at->toISOString(),
                ]),
            'permissions' => $user->toTeamPermissions($team),
            'availableRoles' => TeamRole::assignable(),
            // Which structural (Spatie) role names are assignable is a
            // function of this team's type — see App\Support\TeamRoles.
            // There are no per-team Role rows to query by team_id.
            'orgRoleOptions' => TeamRoles::MAP[$team->type] ?? [],
            'departments' => $team->isHq() ? $team->departments()->withCount('staff')->orderBy('name')->get(['id', 'team_id', 'name', 'code', 'staff_count']) : [],
        ]);
    }

    /**
     * Update the specified team.
     */
    public function update(SaveTeamRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $team = DB::transaction(function () use ($request, $team) {
            $team = Team::whereKey($team->id)->lockForUpdate()->firstOrFail();

            $team->update(['name' => $request->validated('name')]);

            return $team;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team updated.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Switch the user's current team.
     */
    public function switch(Request $request, Team $team): RedirectResponse
    {
        $this->assertSuperAdmin($request);

        $request->user()->switchTeam($team);

        return back();
    }

    /**
     * Leave the specified team.
     */
    public function leave(Request $request, Team $team): RedirectResponse
    {
        Gate::authorize('leave', $team);

        $user = $request->user();

        $fallbackTeam = $user->isCurrentTeam($team)
            ? $user->fallbackTeam($team)
            : null;

        $team
            ->memberships()
            ->where('user_id', $user->id)
            ->delete();

        if ($fallbackTeam) {
            $user->switchTeam($fallbackTeam);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('You left the team ":name"', ['name' => $team->name])]);

        return to_route('teams.index');
    }

    /**
     * Delete the specified team.
     */
    public function destroy(DeleteTeamRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('delete', $team);

        $user = $request->user();
        $fallbackTeam = $user->isCurrentTeam($team)
            ? $user->fallbackTeam($team)
            : null;

        DB::transaction(function () use ($user, $team) {
            User::where('current_team_id', $team->id)
                ->where('id', '!=', $user->id)
                ->each(fn(User $affectedUser) => $affectedUser->switchTeam($affectedUser->personalTeam()));

            $team->invitations()->delete();
            $team->memberships()->delete();
            $team->delete();
        });

        if ($fallbackTeam) {
            $user->switchTeam($fallbackTeam);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Team deleted.')]);

        return to_route('teams.index');
    }

    /**
     * Add a department to an HQ team.
     */
    public function storeDepartment(Request $request, Team $team): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        abort_unless($team->isHq(), 400, __('Departments can only be created under Headquarters teams.'));

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20'],
        ]);

        $name = trim($validated['name']);
        $rawCode = !empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 8));

        if (empty($rawCode)) {
            $rawCode = 'DEPT';
        }

        $code = $rawCode;
        $counter = 1;
        while (Department::where('team_id', $team->id)->where('code', $code)->exists()) {
            $code = substr($rawCode, 0, 5) . $counter;
            $counter++;
        }

        $team->departments()->create([
            'name' => $name,
            'code' => $code,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Department ":name" created.', ['name' => $name])]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Delete a department from an HQ team.
     */
    public function destroyDepartment(Request $request, Team $team, Department $department): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        abort_unless($department->team_id === $team->id, 404);

        $deptName = $department->name;
        $department->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Department ":name" removed.', ['name' => $deptName])]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }
}
