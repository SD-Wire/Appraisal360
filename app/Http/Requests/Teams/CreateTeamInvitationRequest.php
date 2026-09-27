<?php

namespace App\Http\Requests\Teams;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CreateTeamInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // gated by Gate::authorize('inviteMember', $team) in the controller
    }

    public function rules(): array
    {
        $team = $this->route('team');

        return [
            'email' => ['required', 'email', 'max:255'],
            'org_role' => ['required', Rule::in($this->assignableOrgRoles($team))],
            'department_id' => [
                Rule::requiredIf($team->isHq()),
                'nullable',
                Rule::exists('departments', 'id')->where('team_id', $team->id),
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $team = $this->route('team');
            $orgRole = $this->input('org_role');

            if ($orgRole === 'Branch Manager' && $this->branchAlreadyHasManager($team)) {
                $validator->errors()->add('org_role', 'This branch already has a Branch Manager.');
            }

            if ($orgRole === 'HOD' && $this->departmentAlreadyHasHod()) {
                $validator->errors()->add('department_id', 'This department already has an HOD.');
            }
        });
    }

    /**
     * The set of Spatie roles that are actually assignable within this
     * team's context — sourced from TeamRoles::MAP which covers hq, branch,
     * and region team types, so a renamed or newly added role is picked up
     * automatically instead of silently drifting out of sync.
     */
    private function assignableOrgRoles($team): array
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($team->id);

        $structural = \App\Support\TeamRoles::MAP[$team->type] ?? [];

        return Role::where('guard_name', 'web')
            ->whereIn('name', $structural)
            ->pluck('name')
            ->all();
    }

    private function branchAlreadyHasManager($team): bool
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($team->id);

        return User::role('Branch Manager')->where('current_team_id', $team->id)->exists();
    }

    private function departmentAlreadyHasHod(): bool
    {
        $departmentId = $this->input('department_id');

        return $departmentId && \App\Models\Department::whereKey($departmentId)->whereNotNull('hod_user_id')->exists();
    }
}
