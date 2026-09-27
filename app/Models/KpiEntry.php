<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class KpiEntry extends Model
{
    public const EVALUATION_STATUSES = [
        'pending',
        'self_submitted',
        'supervisor_returned',
        'completed',
    ];

    protected $fillable = [
        'kpi_cycle_id',
        'user_id',
        'team_id',
        'department_id',
        'title',
        'description',
        'target',
        'actual_result',
        'weight',
        'self_rating',
        'supervisor_rating',
        'self_comment',
        'supervisor_comment',
        'evaluation_status',
        'evaluation_submitted_at',
        'status',
        'current_approver_id',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'finalized_at' => 'datetime',
        'evaluation_submitted_at' => 'datetime',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(KpiCycle::class, 'kpi_cycle_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(KpiEntryLog::class);
    }
}
