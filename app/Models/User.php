<?php

namespace App\Models;

use App\Concerns\HasTeams;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string|null $employee_no
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property int|null $current_team_id
 * @property int|null $department_id
 * @property int|null $supervisor_id
 * @property string|null $job_title
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team|null $currentTeam
 * @property-read Department|null $department
 * @property-read User|null $supervisor
 * @property-read Collection<int, User> $subordinates
 * @property-read Collection<int, Team> $ownedTeams
 * @property-read Collection<int, Membership> $teamMemberships
 * @property-read Collection<int, Team> $teams
 */
#[Fillable(['name', 'email', 'password', 'current_team_id', 'department_id', 'supervisor_id', 'job_title', 'employee_no'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    use HasFactory, HasRoles, HasTeams, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable {
        HasTeams::teams insteadof HasRoles;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function subordinates(): HasMany
    {
        return $this->hasMany(User::class, 'supervisor_id');
    }

    public function kpiEntries(): HasMany
    {
        return $this->hasMany(KpiEntry::class);
    }

    public function evaluationsAsEvaluatee(): HasMany
    {
        return $this->hasMany(ThreeSixtyEvaluation::class, 'evaluatee_id');
    }

    public function evaluationsAsEvaluator(): HasMany
    {
        return $this->hasMany(ThreeSixtyEvaluation::class, 'evaluator_id');
    }

    public function hrRegions(): BelongsToMany
    {
        return $this->belongsToMany(Region::class, 'region_hrbp');
    }

    public function isHrbpForRegion(?Region $region): bool
    {
        return $region && $this->hrRegions->contains('id', $region->id);
    }

    /**
     * Resolve who reviews this user's KPIs at the "immediate supervisor" stage.
     *
     * HQ staff       -> explicit supervisor_id, else their Department's HOD
     * Branch staff   -> explicit supervisor_id, else their branch's Branch Manager
     * HOD / Branch Manager -> explicit supervisor_id only (no structural default)
     */
    public function resolveSupervisorForKpi(): ?User
    {
        if ($this->supervisor_id) {
            return $this->supervisor;
        }

        if ($this->hasRole('HOD') || $this->hasRole('Branch Manager')) {
            return null;  // misconfiguration — flagged by UserObserver, guarded in submit()
        }

        if ($this->department_id) {
            return $this->department?->hodUser;
        }

        if (! $this->currentTeam) {
            return null;
        }

        return $this->currentTeam
            ->members()
            ->whereHas('roles', fn($q) => $q->where('name', 'Branch Manager'))
            ->first();
    }
}
