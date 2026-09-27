<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingController extends Controller
{
    /**
     * Show the application settings / performance weights page.
     */
    public function index(Request $request): Response
    {
        $kpiWeight = (float) AppSetting::get('kpi_weight', 70);
        $threeSixtyWeight = (float) AppSetting::get('three_sixty_weight', 30);

        return Inertia::render('performance-weights/Index', [
            'kpiWeight' => $kpiWeight,
            'threeSixtyWeight' => $threeSixtyWeight,
            'settings' => AppSetting::where('group', 'performance')->get(),
        ]);
    }

    /**
     * Update performance weights and other configuration.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'kpi_weight' => ['required', 'numeric', 'min:0', 'max:100'],
            'three_sixty_weight' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $kpiWeight = round((float) $validated['kpi_weight'], 2);
        $threeSixtyWeight = round((float) $validated['three_sixty_weight'], 2);

        if (round($kpiWeight + $threeSixtyWeight, 2) != 100.0) {
            return back()->withErrors([
                'kpi_weight' => 'KPI weight and 360° weight must sum to exactly 100%. (Current total: ' . ($kpiWeight + $threeSixtyWeight) . '%)',
            ]);
        }

        AppSetting::set(
            'kpi_weight',
            $kpiWeight,
            'number',
            'performance',
            'KPI Appraisal Weight (%)',
            'Default percentage contribution of KPI evaluations toward combined performance score.'
        );

        AppSetting::set(
            'three_sixty_weight',
            $threeSixtyWeight,
            'number',
            'performance',
            '360° Appraisal Weight (%)',
            'Default percentage contribution of 360° behavioral evaluations toward combined performance score.'
        );

        return back()->with('success', 'Performance weights updated successfully and applied automatically to all reports.');
    }
}
