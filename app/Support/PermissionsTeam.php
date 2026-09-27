<?php

namespace App\Support;

class PermissionsTeam
{
    /**
     * Sentinel team id representing "global, not scoped to any real team."
     * Spatie's model_has_roles/model_has_permissions tables have a NOT
     * NULL team_id as part of their primary key, so true null-team
     * assignments are impossible — this reserved id (never a real
     * teams.id, since that column auto-increments from 1) stands in
     * for "applies everywhere" throughout the app.
     */
    public const GLOBAL = 0;
}
