<?php

namespace App\Http\Requests;

use App\Support\PermissionsTeam;
use Illuminate\Foundation\Http\FormRequest;
use Spatie\Permission\PermissionRegistrar;

class StoreKpiEntryRequest extends FormRequest
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
            'kpi_cycle_id' => ['required', 'exists:kpi_cycles,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'target' => ['nullable', 'string', 'max:255'],
            'weight' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $cycleId = $this->input('kpi_cycle_id');
            if ($user && $cycleId) {
                $existingWeight = (int) $user->kpiEntries()
                    ->where('kpi_cycle_id', $cycleId)
                    ->sum('weight');
                $newWeight = (int) $this->input('weight');

                if ($existingWeight >= 100) {
                    $validator->errors()->add('weight', 'Total KPI weight allocation for this cycle has already reached 100%. Please adjust existing KPI weights first.');
                } elseif ($existingWeight + $newWeight > 100) {
                    $remaining = 100 - $existingWeight;
                    $validator->errors()->add('weight', "Adding {$newWeight}% exceeds the maximum 100% total weight limit. You only have {$remaining}% available to allocate.");
                }
            }
        });
    }
}
