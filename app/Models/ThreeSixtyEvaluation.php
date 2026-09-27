<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ThreeSixtyEvaluation extends Model
{
    use HasFactory;

    public const RELATIONSHIP_TYPES = [
        'supervisor_to_subordinate',
        'subordinate_to_supervisor',
        'branch_peer',
        'department_peer',
        'cross_department',
        'bm_peer',
        'hod_to_bm',
        'bm_to_hod',
        'bm_to_support_staff',
    ];

    public const STATUSES = ['pending', 'in_progress', 'completed'];

    protected $fillable = [
        'three_sixty_cycle_id',
        'evaluator_id',
        'evaluatee_id',
        'relationship_type',
        'status',
        'score',
        'feedback_summary',
        'submitted_at',
        'core_value_comments',
    ];

    protected $casts = [
        'submitted_at'        => 'datetime',
        'score'               => 'float',
        'core_value_comments' => 'array',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(ThreeSixtyCycle::class, 'three_sixty_cycle_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function evaluatee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluatee_id');
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(ThreeSixtyEvaluationRating::class);
    }
}
