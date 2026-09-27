<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThreeSixtyEvaluationRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'three_sixty_evaluation_id',
        'core_value_id',
        'core_value_question_id',
        'score',
        'comment',
    ];

    protected $casts = [
        'score' => 'integer',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(ThreeSixtyEvaluation::class, 'three_sixty_evaluation_id');
    }

    public function coreValue(): BelongsTo
    {
        return $this->belongsTo(CoreValue::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(CoreValueQuestion::class, 'core_value_question_id');
    }
}
