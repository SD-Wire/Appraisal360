<?php

namespace App\Http\Controllers;

use App\Models\CoreValue;
use App\Models\CoreValueQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CoreValueController extends Controller
{
    public function index(): Response
    {
        $coreValues = CoreValue::with(['questions' => function ($q) {
            $q->orderBy('order')->orderBy('id');
        }])
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        return Inertia::render('core-values/Index', [
            'coreValues' => $coreValues,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:core_values,name'],
            'description' => ['nullable', 'string'],
            'weight' => ['required', 'integer', 'min:0', 'max:100'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $maxOrder = CoreValue::max('order') ?? 0;
        $validated['order'] = $validated['order'] ?? ($maxOrder + 1);

        CoreValue::create($validated);

        return redirect()->back()->with('success', 'Core value created successfully.');
    }

    public function update(Request $request, CoreValue $coreValue): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:core_values,name,' . $coreValue->id],
            'description' => ['nullable', 'string'],
            'weight' => ['required', 'integer', 'min:0', 'max:100'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $coreValue->update($validated);

        return redirect()->back()->with('success', 'Core value updated successfully.');
    }

    public function destroy(CoreValue $coreValue): RedirectResponse
    {
        $coreValue->delete();

        return redirect()->back()->with('success', 'Core value deleted successfully.');
    }

    public function storeQuestion(Request $request, CoreValue $coreValue): RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'weight' => ['required', 'integer', 'min:1', 'max:100'],
            'min_score' => ['required', 'integer', 'min:1', 'max:5'],
            'max_score' => ['required', 'integer', 'min:1', 'max:5', 'gte:min_score'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $maxOrder = $coreValue->questions()->max('order') ?? 0;
        $validated['order'] = $validated['order'] ?? ($maxOrder + 1);
        $validated['core_value_id'] = $coreValue->id;

        CoreValueQuestion::create($validated);

        return redirect()->back()->with('success', 'Evaluation question added successfully.');
    }

    public function updateQuestion(Request $request, CoreValueQuestion $question): RedirectResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'weight' => ['required', 'integer', 'min:1', 'max:100'],
            'min_score' => ['required', 'integer', 'min:1', 'max:5'],
            'max_score' => ['required', 'integer', 'min:1', 'max:5', 'gte:min_score'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $question->update($validated);

        return redirect()->back()->with('success', 'Evaluation question updated successfully.');
    }

    public function destroyQuestion(CoreValueQuestion $question): RedirectResponse
    {
        $question->delete();

        return redirect()->back()->with('success', 'Evaluation question deleted successfully.');
    }
}
