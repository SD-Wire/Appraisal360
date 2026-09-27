<?php

namespace App\Models;

use App\Concerns\HasTeams;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

#[Fillable(['team_id', 'name', 'code', 'hod_user_id'])]
class Department extends Model
{
    use HasFactory, HasTeams;

    protected $casts = [
        'hod_user_id' => 'int',
    ];

    public function hodUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hod_user_id');
    }

    public function staff(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function kpiEntries(): HasMany
    {
        return $this->hasMany(KpiEntry::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
