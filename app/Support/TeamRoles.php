<?php

namespace App\Support;

/**
 * Maps a Team's `type` to the structural role names assignable on it.
 * This replaces the old (unimplemented) idea of per-team Role rows —
 * there is one Role row per name globally; this map decides which
 * names are valid choices for a given team type.
 */
final class TeamRoles
{
    public const MAP = [
        'branch' => ['Branch Manager', 'Staff'],
        'hq' => ['CEO', 'COO', 'HOB', 'HOBS', 'HOD', 'Staff'],
        'region' => ['RM', 'RSTL'],
    ];
}
