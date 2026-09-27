<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThreeSixtyStaffAppraisalComment extends Model
{
    use HasFactory;

    protected $table = 'three_sixty_staff_appraisal_comments';

    protected $fillable = [
        'three_sixty_cycle_id',
        'user_id',
        'status',
        'overall_comment',
        'parameter_comments',
        'submitted_at',
    ];

    protected $casts = [
        'parameter_comments' => 'array',
        'submitted_at'       => 'datetime',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(ThreeSixtyCycle::class, 'three_sixty_cycle_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function logs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ThreeSixtyStaffAppraisalCommentLog::class, 'comment_id')->orderByDesc('created_at');
    }
}
