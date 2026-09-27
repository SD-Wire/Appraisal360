<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use App\Notifications\PendingAppraisalDailyReminder;
use App\Services\PendingAppraisalsReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PendingAppraisalsReportController extends Controller
{
    /**
     * Display the Pending & Incomplete Appraisals Completion Tracking Report.
     * Accessible strictly to HOD, Branch Managers, Regional HRBP, and Super Admin.
     */
    public function index(Request $request, Team $current_team): Response
    {
        $user = $request->user();

        $data = PendingAppraisalsReportService::getReportData($user, $current_team, $request->all());

        return Inertia::render('Reports/PendingAppraisals', [
            'scope'               => $data['scope'],
            'stats'               => $data['stats'],
            'users'               => $data['users'],
            'threeSixtyCycles'    => $data['threeSixtyCycles'],
            'kpiCycles'           => $data['kpiCycles'],
            'selected360Cycle'    => $data['selected360Cycle'],
            'selectedKpiCycle'    => $data['selectedKpiCycle'],
            'departments'         => $data['departments'],
            'teams'               => $data['teams'],
            'regions'             => $data['regions'],
            'filters'             => $data['filters'],
        ]);
    }

    /**
     * Manually trigger reminder notifications to one or all eligible users within scope.
     *
     * Rule:
     * "if user has any remaining; an automated email sent daily to notify untill the submission dateline is reached then messages stops."
     */
    public function sendReminders(Request $request, Team $current_team): RedirectResponse
    {
        $user = $request->user();
        $scope = PendingAppraisalsReportService::resolveUserScope($user, $current_team);

        abort_unless($scope['isAuthorized'], 403, 'Unauthorized to send appraisal reminder notifications.');

        $targetUserId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
        $managerNote = $request->filled('manager_note') ? trim((string) $request->input('manager_note')) : null;

        $recipients = PendingAppraisalsReportService::getEligibleReminderRecipients(
            $targetUserId,
            $user
        );

        if ($recipients->isEmpty()) {
            return back()->with('info', 'No users are currently eligible for appraisal reminders (all completed or submission deadlines have expired).');
        }

        $sentCount = 0;

        foreach ($recipients as $item) {
            $recipientUser = $item['user'];
            $data = $item['data'];

            $teamSlug = $recipientUser->currentTeam?->slug ?? $current_team->slug;
            $actionUrl = url("/{$teamSlug}/dashboard");

            $recipientUser->notify(new PendingAppraisalDailyReminder($data, $actionUrl, $managerNote));
            $sentCount++;
        }

        if ($targetUserId && $sentCount === 1) {
            $targetName = $recipients->first()['user']->name ?? 'User';
            return back()->with('success', "Appraisal reminder email successfully sent to {$targetName}.");
        }

        return back()->with('success', "Appraisal reminder emails successfully dispatched to {$sentCount} pending evaluator(s).");
    }
}
