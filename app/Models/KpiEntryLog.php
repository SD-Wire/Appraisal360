<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class KpiEntryLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['kpi_entry_id', 'actor_id', 'stage', 'action', 'comment', 'created_at'];
    protected $casts = ['created_at' => 'datetime'];

    protected static function booted(): void
    {
        static::creating(fn($log) => $log->created_at ??= now());
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(KpiEntry::class, 'kpi_entry_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
