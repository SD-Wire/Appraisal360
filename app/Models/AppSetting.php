<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
    ];

    /**
     * Retrieve a setting value by key with fallback.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $cacheKey = "app_setting_{$key}";

        return Cache::remember($cacheKey, 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();

            if (!$setting || $setting->value === null) {
                return $default;
            }

            return match ($setting->type) {
                'number' => is_numeric($setting->value)
                    ? (str_contains($setting->value, '.') ? (float) $setting->value : (int) $setting->value)
                    : $default,
                'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
                'json' => json_decode($setting->value, true) ?? $default,
                default => $setting->value,
            };
        });
    }

    /**
     * Store or update a setting value.
     */
    public static function set(
        string $key,
        mixed $value,
        ?string $type = null,
        ?string $group = null,
        ?string $label = null,
        ?string $description = null
    ): self {
        $serializedValue = is_array($value) || is_object($value)
            ? json_encode($value)
            : (string) $value;

        $attributes = ['value' => $serializedValue];
        if ($type !== null) {
            $attributes['type'] = $type;
        }
        if ($group !== null) {
            $attributes['group'] = $group;
        }
        if ($label !== null) {
            $attributes['label'] = $label;
        }
        if ($description !== null) {
            $attributes['description'] = $description;
        }

        $setting = static::updateOrCreate(
            ['key' => $key],
            $attributes
        );

        Cache::forget("app_setting_{$key}");

        return $setting;
    }
}
