<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveKpiSelfScoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'self_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'actual_result' => ['required', 'string', 'max:2000'],
            'self_comment' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }
}
