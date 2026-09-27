<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoreValueQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'core_value_id',
        'question',
        'description',
        'weight',
        'min_score',
        'max_score',
        'order',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'integer',
        'min_score' => 'integer',
        'max_score' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function coreValue(): BelongsTo
    {
        return $this->belongsTo(CoreValue::class);
    }
}
