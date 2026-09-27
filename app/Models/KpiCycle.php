<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KpiCycle extends Model
{
    public const STATUSES = ['draft', 'open', 'closed'];

    public const PHASES = ['goal_setting', 'evaluation'];

    protected $fillable = [
        'name',
        'period_start',
        'period_end',
        'submission_deadline',
        'evaluation_deadline',
        'status',
        'phase',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'submission_deadline' => 'date',
        'evaluation_deadline' => 'date',
    ];

    public function isInEvaluationPhase(): bool
    {
        return $this->phase === 'evaluation';
    }
}
