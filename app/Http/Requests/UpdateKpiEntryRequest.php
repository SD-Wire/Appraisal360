<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Spatie\Permission\PermissionRegistrar;

class UpdateKpiEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $team = $this->route('current_team');

        if (!$user || !$team) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId($team->id);
        $user->unsetRelation('roles')->unsetRelation('permissions');

        try {
            return $user->can('kpi.capture');
        } finally {
            $registrar->setPermissionsTeamId($previousTeamId);
            $user->unsetRelation('roles')->unsetRelation('permissions');
        }
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:5000'],
            'target' => ['nullable', 'string', 'max:255'],
            'weight' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
