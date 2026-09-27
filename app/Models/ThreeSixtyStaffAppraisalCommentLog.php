<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThreeSixtyStaffAppraisalCommentLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'three_sixty_staff_appraisal_comment_logs';

    protected $fillable = [
        'comment_id',
        'actor_id',
        'action',
        'actor_role',
        'details',
        'changes',
        'ip_address',
        'created_at',
    ];

    protected $casts = [
        'changes'    => 'array',
        'created_at' => 'datetime',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(ThreeSixtyStaffAppraisalComment::class, 'comment_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
