<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CoreValue extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'weight',
        'order',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(CoreValueQuestion::class)->orderBy('order');
    }
}
