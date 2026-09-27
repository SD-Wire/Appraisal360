<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ThreeSixtyCycle extends Model
{
    use HasFactory;

    public const STATUSES = ['draft', 'open', 'closed'];

    protected $fillable = [
        'name',
        'kpi_cycle_id',
        'period_start',
        'period_end',
        'evaluation_deadline',
        'status',
        'description',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'evaluation_deadline' => 'date',
    ];

    public function kpiCycle(): BelongsTo
    {
        return $this->belongsTo(KpiCycle::class);
    }

    public function rules(): HasMany
    {
        return $this->hasMany(ThreeSixtyRelationshipRule::class);
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(ThreeSixtyEvaluation::class);
    }

    public function staffAppraisalComments(): HasMany
    {
        return $this->hasMany(ThreeSixtyStaffAppraisalComment::class);
    }

    /**
     * Check if the 360 appraisal period has elapsed (closed or deadline has passed).
     */
    public function isPeriodElapsed(): bool
    {
        if ($this->status === 'closed') {
            return true;
        }

        if ($this->evaluation_deadline && now()->startOfDay()->gte($this->evaluation_deadline->startOfDay())) {
            return true;
        }

        if ($this->period_end && now()->startOfDay()->gte($this->period_end->startOfDay())) {
            return true;
        }

        return false;
    }
}
