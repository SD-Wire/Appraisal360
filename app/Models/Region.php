<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    protected $fillable = ['name', 'code'];

    public function branches(): HasMany
    {
        return $this->hasMany(Team::class, 'region_id');
    }

    public function hrbps(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'region_hrbp');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'region_user');
    }
}
