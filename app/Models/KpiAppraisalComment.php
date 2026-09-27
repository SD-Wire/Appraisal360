<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiAppraisalComment extends Model
{
    use HasFactory;

    protected $table = 'kpi_appraisal_comments';

    protected $fillable = [
        'kpi_cycle_id',
        'user_id',
        'supervisor_positives',
        'supervisor_areas_to_improve',
        'supervisor_concluding_remarks',
        'staff_achievement_reasons',
        'staff_future_commitment',
        'staff_training_requests',
        'status',
        'staff_submitted_at',
        'supervisor_submitted_at',
    ];

    protected $casts = [
        'staff_submitted_at'      => 'datetime',
        'supervisor_submitted_at' => 'datetime',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(KpiCycle::class, 'kpi_cycle_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
