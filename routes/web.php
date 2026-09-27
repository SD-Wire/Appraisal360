<?php

use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\CoreValueController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GlobalRoleController;
use App\Http\Controllers\KpiCycleController;
use App\Http\Controllers\KpiEntryController;
use App\Http\Controllers\KpiEvaluationController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\UserRoleController;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Registration is disabled (staff are invited to teams by administrators)
Route::match(['get', 'post'], '/register', function () {
    return redirect()->route('login');
})->name('register');

Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
    $user = $request->user();
    $team = $user?->currentTeam ?? $user?->fallbackTeam();
    if ($team) {
        return redirect()->route('dashboard', ['current_team' => $team->slug]);
    }
    abort(403, 'No team available.');
})->middleware(['auth'])->name('dashboard.redirect');

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');
});

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::middleware(['auth'])->group(function () {
            Route::get('/kpi', [KpiEntryController::class, 'index'])->name('kpi.index');
            Route::get('/kpi/create', [KpiEntryController::class, 'create'])->name('kpi.create');
            Route::post('/kpi/entry', [KpiEntryController::class, 'store'])->name('kpi.store');
            Route::get('/kpi/entry/{kpiEntry}', [KpiEntryController::class, 'show'])->name('kpi.show');
            Route::get('/kpi/entry/{kpiEntry}/edit', [KpiEntryController::class, 'edit'])->name('kpi.edit');
            Route::put('/kpi/entry/{kpiEntry}', [KpiEntryController::class, 'update'])->name('kpi.update');
            Route::post('/kpi/entry/{kpiEntry}/submit', [KpiEntryController::class, 'submit'])->name('kpi.submit');

            Route::get('/kpi/review', [KpiEntryController::class, 'reviewQueue'])->name('kpi.review-queue');
            Route::get('/kpi/review/{kpiEntry}', [KpiEntryController::class, 'reviewShow'])->name('kpi.review-show');
            Route::post('/kpi/review/{kpiEntry}/supervisor-approve', [KpiEntryController::class, 'approveAsSupervisor'])->name('kpi.review.supervisor-approve');
            Route::post('/kpi/review/{kpiEntry}/supervisor-return', [KpiEntryController::class, 'returnAsSupervisor'])->name('kpi.review.supervisor-return');
            Route::post('/kpi/review/{kpiEntry}/hr-approve', [KpiEntryController::class, 'approveAsHr'])->name('kpi.review.hr-approve');
            Route::post('/kpi/review/{kpiEntry}/hr-return', [KpiEntryController::class, 'returnAsHr'])->name('kpi.review.hr-return');

            Route::get('/kpi/evaluation', [KpiEvaluationController::class, 'index'])->name('kpi.evaluation.index');
            Route::put('/kpi/evaluation/{kpiEntry}', [KpiEvaluationController::class, 'saveSelfScore'])->name('kpi.evaluation.save');
            Route::post('/kpi/evaluation/submit', [KpiEvaluationController::class, 'submitSelfEvaluation'])->name('kpi.evaluation.submit');
            Route::get('/kpi/evaluation/review', [KpiEvaluationController::class, 'reviewQueue'])->name('kpi.evaluation.review-queue');
            Route::get('/kpi/evaluation/review/{kpiEntry}', [KpiEvaluationController::class, 'reviewShow'])->name('kpi.evaluation.review-show');
            Route::post('/kpi/evaluation/review/{kpiEntry}/approve', [KpiEvaluationController::class, 'approveAsSupervisor'])->name('kpi.evaluation.supervisor-approve');
            Route::post('/kpi/evaluation/review/{kpiEntry}/return', [KpiEvaluationController::class, 'returnAsSupervisor'])->name('kpi.evaluation.supervisor-return');

            Route::get('kpi/cycles', [KpiCycleController::class, 'index'])->name('kpi.cycles.index');
            Route::post('kpi/cycles', [KpiCycleController::class, 'store'])->name('kpi.cycles.store');
            Route::put('kpi/cycles/{kpiCycle}', [KpiCycleController::class, 'update'])->name('kpi.cycles.update');
            Route::delete('kpi/cycles/{kpiCycle}', [KpiCycleController::class, 'destroy'])->name('kpi.cycles.destroy');
            Route::post('kpi/cycles/{kpiCycle}/open', [KpiCycleController::class, 'open'])->name('kpi.cycles.open');
            Route::post('kpi/cycles/{kpiCycle}/close', [KpiCycleController::class, 'close'])->name('kpi.cycles.close');
            Route::post('kpi/cycles/{kpiCycle}/start-evaluation', [KpiCycleController::class, 'startEvaluation'])->name('kpi.cycles.start-evaluation');

            Route::get('/three-sixty/evaluations', [\App\Http\Controllers\ThreeSixtyEvaluationController::class, 'index'])->name('three-sixty.evaluations.index');
            Route::get('/three-sixty/evaluations/{evaluation}', [\App\Http\Controllers\ThreeSixtyEvaluationController::class, 'show'])->name('three-sixty.evaluations.show');
            Route::post('/three-sixty/evaluations/{evaluation}/submit', [\App\Http\Controllers\ThreeSixtyEvaluationController::class, 'submit'])->name('three-sixty.evaluations.submit');
            Route::post('/three-sixty/evaluations/{evaluation}/draft', [\App\Http\Controllers\ThreeSixtyEvaluationController::class, 'saveDraft'])->name('three-sixty.evaluations.draft');
            Route::get('/reports/performance', [\App\Http\Controllers\PerformanceReportController::class, 'index'])->name('reports.performance');
            Route::post('/reports/three-sixty/staff-comment', [\App\Http\Controllers\PerformanceReportController::class, 'saveStaffComment'])->name('reports.three-sixty.staff-comment');
            Route::post('/reports/kpi/comment', [\App\Http\Controllers\PerformanceReportController::class, 'saveKpiComment'])->name('reports.kpi.comment');
            Route::get('/reports/feedback-summary', [\App\Http\Controllers\ThreeSixtyFeedbackReportController::class, 'index'])
                ->middleware([\App\Http\Middleware\EnsureHrbpOrSuperAdmin::class])
                ->name('reports.feedback-summary');
            Route::get('/reports/pending-appraisals', [\App\Http\Controllers\PendingAppraisalsReportController::class, 'index'])
                ->name('reports.pending-appraisals');
            Route::post('/reports/pending-appraisals/send-reminders', [\App\Http\Controllers\PendingAppraisalsReportController::class, 'sendReminders'])
                ->name('reports.pending-appraisals.send-reminders');
        });
    });
Route::middleware(['auth'])->group(function () {
    Route::middleware(['global.permission:roles.manage'])->group(function () {
        Route::get('/settings/roles', [RolePermissionController::class, 'index'])->name('roles.index');
        Route::put('/settings/roles/{role}', [RolePermissionController::class, 'update'])->name('roles.update');

        Route::get('/settings/users', [UserRoleController::class, 'index'])->name('users.index');
        Route::put('/settings/users/{user}/role', [UserRoleController::class, 'updateRole'])->name('users.update-role');

        Route::get('/settings/core-values', [CoreValueController::class, 'index'])->name('core-values.index');
        Route::post('/settings/core-values', [CoreValueController::class, 'store'])->name('core-values.store');
        Route::put('/settings/core-values/{coreValue}', [CoreValueController::class, 'update'])->name('core-values.update');
        Route::delete('/settings/core-values/{coreValue}', [CoreValueController::class, 'destroy'])->name('core-values.destroy');

        Route::post('/settings/core-values/{coreValue}/questions', [CoreValueController::class, 'storeQuestion'])->name('core-values.questions.store');
        Route::put('/settings/core-values/questions/{question}', [CoreValueController::class, 'updateQuestion'])->name('core-values.questions.update');
        Route::delete('/settings/core-values/questions/{question}', [CoreValueController::class, 'destroyQuestion'])->name('core-values.questions.destroy');

        Route::get('/settings/three-sixty', [\App\Http\Controllers\ThreeSixtySetupController::class, 'index'])->name('three-sixty.index');
        Route::post('/settings/three-sixty/cycles', [\App\Http\Controllers\ThreeSixtySetupController::class, 'storeCycle'])->name('three-sixty.cycles.store');
        Route::put('/settings/three-sixty/cycles/{cycle}', [\App\Http\Controllers\ThreeSixtySetupController::class, 'updateCycle'])->name('three-sixty.cycles.update');
        Route::delete('/settings/three-sixty/cycles/{cycle}', [\App\Http\Controllers\ThreeSixtySetupController::class, 'destroyCycle'])->name('three-sixty.cycles.destroy');
        Route::post('/settings/three-sixty/cycles/{cycle}/open', [\App\Http\Controllers\ThreeSixtySetupController::class, 'openCycle'])->name('three-sixty.cycles.open');
        Route::post('/settings/three-sixty/cycles/{cycle}/close', [\App\Http\Controllers\ThreeSixtySetupController::class, 'closeCycle'])->name('three-sixty.cycles.close');
        Route::post('/settings/three-sixty/cycles/{cycle}/generate', [\App\Http\Controllers\ThreeSixtySetupController::class, 'generateEvaluations'])->name('three-sixty.cycles.generate');

        Route::post('/settings/three-sixty/cycles/{cycle}/rules', [\App\Http\Controllers\ThreeSixtySetupController::class, 'storeRule'])->name('three-sixty.rules.store');
        Route::put('/settings/three-sixty/rules/{rule}', [\App\Http\Controllers\ThreeSixtySetupController::class, 'updateRule'])->name('three-sixty.rules.update');
        Route::delete('/settings/three-sixty/rules/{rule}', [\App\Http\Controllers\ThreeSixtySetupController::class, 'destroyRule'])->name('three-sixty.rules.destroy');

        Route::get('/settings/performance-weights', [\App\Http\Controllers\AppSettingController::class, 'index'])->name('performance-weights.index');
        Route::put('/settings/performance-weights', [\App\Http\Controllers\AppSettingController::class, 'update'])->name('performance-weights.update');
    });

    Route::middleware([EnsureSuperAdmin::class])->group(function () {
        Route::get('/settings/global-roles', [GlobalRoleController::class, 'index'])->name('global-roles.index');
        Route::post('/settings/global-roles/{user}/grant', [GlobalRoleController::class, 'grant'])->name('global-roles.grant');
        Route::post('/settings/global-roles/{user}/revoke', [GlobalRoleController::class, 'revoke'])->name('global-roles.revoke');
    });
    Route::put('users/{user}/global-role', [UserRoleController::class, 'updateGlobalRole'])
        ->name('users.updateGlobalRole');
});

require __DIR__ . '/settings.php';
