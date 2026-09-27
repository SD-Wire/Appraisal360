<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ThreeSixtyRelationshipRule extends Model
{
    use HasFactory;

    public const RULE_TYPES = [
        'branch_internal',
        'dept_internal',
        'cross_dept',
        'bm_peers',
        'hod_and_bm',
        'bm_to_dept_staff',
        'rm_bm_region',         // RM and Branch Managers within their region
        'rstl_bm_region',       // RSTL and Branch Managers within their region
        'regional_and_hod',     // RM/RSTL and HODs
        'regional_to_dept_staff', // RM/RSTL and specific HQ department staff
        'individual_staff',     // Specific staff member appraised by selected individuals
    ];

    public const DIRECTIONS = ['mutual', 'source_evaluates_target', 'target_evaluates_source'];

    protected $fillable = [
        'three_sixty_cycle_id',
        'name',
        'rule_type',
        'source_ids',
        'target_ids',
        'direction',
        'include_peers',
        'is_active',
    ];

    protected $casts = [
        'source_ids'    => 'array',
        'target_ids'    => 'array',
        'include_peers' => 'boolean',
        'is_active'     => 'boolean',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(ThreeSixtyCycle::class, 'three_sixty_cycle_id');
    }
}
