<?php

namespace App\Http\Requests\Teams;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeamMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // gated by Gate::authorize('updateMember', $team) in the controller
    }

    public function rules(): array
    {
        $team = $this->route('team');

        return [
            'org_role' => [
                'required',
                Rule::in(app(\Spatie\Permission\PermissionRegistrar::class)
                    ->setPermissionsTeamId($team->id)
                        ? \Spatie\Permission\Models\Role::where('guard_name', 'web')
                            ->whereIn('name', $team->isHq() ? ['HOD', 'Staff', 'HOBS', 'COO', 'HOB', 'CEO'] : ['Branch Manager', 'Staff'])
                            ->pluck('name')
                            ->all()
                        : []),
            ],
            'department_id' => [
                Rule::requiredIf($team->isHq()),
                'nullable',
                Rule::exists('departments', 'id')->where('team_id', $team->id),
            ],
        ];
    }
}
