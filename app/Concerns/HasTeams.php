<?php

namespace App\Concerns;

use App\Data\TeamPermissions;
use App\Data\UserTeam;
use App\Enums\TeamPermission;
use App\Enums\TeamRole;
use App\Models\Membership;
use App\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Collection;
use App\Support\PermissionsTeam;
use Spatie\Permission\PermissionRegistrar;

/**
 * @property int|null $current_team_id
 * @mixin \App\Models\User
 * @mixin \Illuminate\Database\Eloquent\Model
 * @mixin \Spatie\Permission\Traits\HasRoles
 *
 * @method bool hasRole(string|array|\Spatie\Permission\Contracts\Role|\Illuminate\Support\Collection ...$roles, ?string $guard = null)
 * @method $this unsetRelation(string $relation)
 */
trait HasTeams
{
    /**
     * Get all of the teams the user belongs to.
     *
     * @return BelongsToMany<Team, $this>
     */
    public function teams(): BelongsToMany
    {
        return $this
            ->belongsToMany(Team::class, 'team_members', 'user_id', 'team_id')
            ->withPivot(['role'])
            ->withTimestamps();
    }

    /**
     * Get all of the teams the user owns.
     *
     * @return HasManyThrough<Team, Membership, $this>
     */
    public function ownedTeams(): HasManyThrough
    {
        return $this->hasManyThrough(
            Team::class,
            Membership::class,
            'user_id',
            'id',
            'id',
            'team_id',
        )->where('team_members.role', TeamRole::Owner->value);
    }

    /**
     * Get all of the memberships for the user.
     *
     * @return HasMany<Membership, $this>
     */
    public function teamMemberships(): HasMany
    {
        return $this->hasMany(Membership::class, 'user_id');
    }

    /**
     * Get the user's current team.
     *
     * @return BelongsTo<Team, $this>
     */
    public function currentTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    /**
     * Get the user's personal team.
     */
    public function personalTeam(): ?Team
    {
        return $this
            ->ownedTeams()
            ->where('teams.is_personal', true)
            ->first();
    }

    /**
     * Switch to the given team.
     */
    public function switchTeam(Team $team): bool
    {
        $canSwitch = $this->belongsToTeam($team)
            || $this->isSuperAdmin()
            || ($this->isHrbp() && ($this->hrRegions->isEmpty() || $this->isHrbpForRegion($team->region)));

        if (!$canSwitch) {
            return false;
        }

        $this->update(['current_team_id' => $team->id]);
        $this->setRelation('currentTeam', $team);

        URL::defaults(['current_team' => $team->slug]);

        return true;
    }

    /**
     * Determine if the user belongs to the given team.
     */
    public function belongsToTeam(Team $team): bool
    {
        return $this->teams()->where('teams.id', $team->id)->exists();
    }

    /**
     * Determine if the given team is the user's current team.
     */
    public function isCurrentTeam(Team $team): bool
    {
        return $this->current_team_id === $team->id;
    }

    /**
     * Determine if the user is the owner of the given team.
     */
    public function ownsTeam(Team $team): bool
    {
        return $this->teamRole($team) === TeamRole::Owner;
    }

    /**
     * Get the user's role on the given team.
     */
    public function teamRole(Team $team): ?TeamRole
    {
        return $this
            ->teamMemberships()
            ->where('team_id', $team->id)
            ->first()
            ?->role;
    }

    /**
     * Get the user's teams as a collection of UserTeam objects.
     *
     * @return Collection<int, UserTeam>
     */
    public function toUserTeams(bool $includeCurrent = false): Collection
    {
        return $this
            ->teams()
            ->with('region')
            ->get()
            ->map(fn(Team $team) => !$includeCurrent && $this->isCurrentTeam($team) ? null : $this->toUserTeam($team))
            ->filter()
            ->values();
    }

    /**
     * Get the user's team as a UserTeam object.
     */
    public function toUserTeam(Team $team): UserTeam
    {
        $role = $this->teamRole($team);

        return new UserTeam(
            id: $team->id,
            name: $team->name,
            slug: $team->slug,
            isPersonal: $team->is_personal,
            role: $role?->value ?? ($this->isSuperAdmin() ? 'admin' : null),
            roleLabel: $role?->label() ?? ($this->isSuperAdmin() ? 'Super Admin' : null),
            isCurrent: $this->isCurrentTeam($team),
            type: $team->type,
            regionName: $team->region?->name,
            regionCode: $team->region?->code,
            regionId: $team->region_id,
        );
    }

    /**
     * Get the standard permissions for a team as a TeamPermissions object.
     */
    public function toTeamPermissions(Team $team): TeamPermissions
    {
        if ($this->isSuperAdmin()) {
            return new TeamPermissions(
                canUpdateTeam: true,
                canDeleteTeam: !$team->is_personal,
                canAddMember: true,
                canUpdateMember: true,
                canRemoveMember: true,
                canCreateInvitation: true,
                canCancelInvitation: true,
            );
        }

        $role = $this->teamRole($team);

        return new TeamPermissions(
            canUpdateTeam: $role?->hasPermission(TeamPermission::UpdateTeam) ?? false,
            canDeleteTeam: false,
            canAddMember: $role?->hasPermission(TeamPermission::AddMember) ?? false,
            canUpdateMember: $role?->hasPermission(TeamPermission::UpdateMember) ?? false,
            canRemoveMember: $role?->hasPermission(TeamPermission::RemoveMember) ?? false,
            canCreateInvitation: $role?->hasPermission(TeamPermission::CreateInvitation) ?? false,
            canCancelInvitation: $role?->hasPermission(TeamPermission::CancelInvitation) ?? false,
        );
    }

    public function fallbackTeam(?Team $excluding = null): ?Team
    {
        $team = $this
            ->teams()
            ->when($excluding, fn($query) => $query->where('teams.id', '!=', $excluding->id))
            ->orderByRaw('LOWER(teams.name)')
            ->first();

        if ($team) {
            return $team;
        }

        if ($this->isSuperAdmin()) {
            return Team::where('type', 'hq')
                ->when($excluding, fn($query) => $query->where('teams.id', '!=', $excluding->id))
                ->first()
                ?? Team::when($excluding, fn($query) => $query->where('teams.id', '!=', $excluding->id))
                    ->orderByRaw('LOWER(teams.name)')
                    ->first();
        }

        if ($this->isHrbp()) {
            $userRegionIds = $this->hrRegions->pluck('id')->all();
            return Team::query()
                ->when(!empty($userRegionIds), fn($q) => $q->whereIn('region_id', $userRegionIds))
                ->when($excluding, fn($query) => $query->where('teams.id', '!=', $excluding->id))
                ->orderByRaw('LOWER(teams.name)')
                ->first()
                ?? Team::where('type', 'hq')->first()
                ?? Team::orderByRaw('LOWER(teams.name)')->first();
        }

        return null;
    }

    /**
     * Determine if the user has the given permission on the team.
     */
    public function hasTeamPermission(Team $team, TeamPermission $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->teamRole($team)?->hasPermission($permission) ?? false;
    }

    /**
     * Get the teams this user should see in team-selection UI: every team
     * if they're a Super Admin, teams in their region if HRBP, otherwise only teams they're a member of.
     *
     * @return Collection<int, UserTeam>
     */
    public function visibleTeams(bool $includeCurrent = false): Collection
    {
        if ($this->isSuperAdmin()) {
            return Team::with('region')
                ->orderBy('name')
                ->get()
                ->map(fn(Team $team) => !$includeCurrent && $this->isCurrentTeam($team) ? null : $this->toUserTeam($team))
                ->filter()
                ->values();
        }

        if ($this->isHrbp()) {
            $userRegionIds = $this->hrRegions->pluck('id')->all();
            $query = Team::with('region')->orderBy('name');
            if (!empty($userRegionIds)) {
                $query->whereIn('region_id', $userRegionIds);
            }

            return $query->get()
                ->map(fn(Team $team) => !$includeCurrent && $this->isCurrentTeam($team) ? null : $this->toUserTeam($team))
                ->filter()
                ->values();
        }

        return $this->toUserTeams($includeCurrent);
    }

    /**
     * Determine if this user holds a specific global (non-team-scoped) role.
     */
    public function hasGlobalRole(string $role): bool
    {
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->unsetRelation('roles');

        $result = $this->hasRole($role);

        $this->unsetRelation('roles');
        $registrar->setPermissionsTeamId($previousTeamId);

        return $result;
    }

    /**
     * Determine if this user holds the global Super Admin role.
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasGlobalRole('Super Admin');
    }

    /**
     * Determine if this user holds the global HR Business Partner role.
     */
    public function isHrbp(): bool
    {
        return $this->hasGlobalRole('HR Business Partner');
    }

    /**
     * Determine if this user holds a specific global permission.
     */
    public function hasGlobalPermission(string $permission): bool
    {
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');

        try {
            $result = $this->hasPermissionTo($permission);
        } catch (\Throwable) {
            $result = false;
        }

        $this->unsetRelation('permissions');
        $this->unsetRelation('roles');
        $registrar->setPermissionsTeamId($previousTeamId);

        return $result;
    }
}
