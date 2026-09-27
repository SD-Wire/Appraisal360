<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewKpiEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // gated by policy in the controller
    }

    public function rules(): array
    {
        $isReturn = str($this->route()->getName())->contains('return');

        return [
            'comment' => [$isReturn ? 'required' : 'nullable', 'string', 'max:2000'],
        ];
    }
}
