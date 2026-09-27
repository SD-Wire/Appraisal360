<?php

namespace Tests\Feature;

use App\Console\Commands\SendPendingAppraisalReminders;
use App\Models\Department;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\KpiEvaluation;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\User;
use App\Notifications\PendingAppraisalDailyReminder;
use App\Services\PendingAppraisalsReportService;
use App\Support\PermissionsTeam;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PendingAppraisalsReportTest extends TestCase
{
    use RefreshDatabase;

    private Region $region;
    private Team $hqTeam;
    private Team $branchTeam;
    private Department $department;
    private User $superAdmin;
    private User $hrbp;
    private User $branchManager;
    private User $regularStaff;
    private ThreeSixtyCycle $cycle360;
    private KpiCycle $cycleKpi;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->region = Region::create([
            'name' => 'Nairobi Region',
            'code' => 'NRB',
        ]);

        $this->hqTeam = Team::factory()->create([
            'name' => 'HQ Support',
            'slug' => 'hq-support',
            'type' => 'hq',
            'region_id' => $this->region->id,
            'is_personal' => false,
        ]);

        $this->branchTeam = Team::factory()->create([
            'name' => 'Kenyatta Avenue Branch',
            'slug' => 'kenyatta-avenue-branch',
            'type' => 'branch',
            'region_id' => $this->region->id,
            'is_personal' => false,
        ]);

        $this->department = Department::create([
            'team_id' => $this->hqTeam->id,
            'name' => 'Finance & Accounting',
            'code' => 'FIN',
        ]);

        // Super Admin
        $this->superAdmin = User::factory()->withoutPersonalTeam()->create([
            'name' => 'System SuperAdmin',
            'email' => 'superadmin@example.com',
            'current_team_id' => $this->hqTeam->id,
        ]);
        $this->hqTeam->members()->attach($this->superAdmin, ['role' => \App\Enums\TeamRole::Owner->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->superAdmin->assignRole('Super Admin');

        // Regional HRBP
        $this->hrbp = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Regional HRBP',
            'email' => 'hrbp@example.com',
            'current_team_id' => $this->hqTeam->id,
        ]);
        $this->hrbp->hrRegions()->attach($this->region);
        $this->hqTeam->members()->attach($this->hrbp, ['role' => \App\Enums\TeamRole::Member->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->hrbp->assignRole('HR Business Partner');

        // Branch Manager (Branch Admin)
        $this->branchManager = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Branch Manager John',
            'email' => 'bm@example.com',
            'current_team_id' => $this->branchTeam->id,
        ]);
        $this->branchTeam->members()->attach($this->branchManager, ['role' => \App\Enums\TeamRole::Admin->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->branchManager->assignRole('Branch Manager');

        // Regular Staff
        $this->regularStaff = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Staff Member Alice',
            'email' => 'alice@example.com',
            'current_team_id' => $this->branchTeam->id,
        ]);
        $this->branchTeam->members()->attach($this->regularStaff, ['role' => \App\Enums\TeamRole::Member->value]);

        // Active 360 Cycle with future deadline
        $this->cycle360 = ThreeSixtyCycle::create([
            'name' => '2026 Q3 360 Review',
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'evaluation_deadline' => now()->addDays(5),
            'status' => 'open',
        ]);

        // Active KPI Cycle with future review deadline
        $this->cycleKpi = KpiCycle::create([
            'name' => '2026 Q3 KPI Cycle',
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'submission_deadline' => now()->addDays(3),
            'evaluation_deadline' => now()->addDays(7),
            'status' => 'open',
            'phase' => 'evaluation',
        ]);
    }

    public function test_super_admin_can_access_pending_appraisals_report(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('reports.pending-appraisals', ['current_team' => $this->hqTeam]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/PendingAppraisals')
            ->has('stats')
            ->has('users')
            ->has('filters')
        );
    }

    public function test_branch_manager_can_access_report(): void
    {
        $response = $this->actingAs($this->branchManager)
            ->get(route('reports.pending-appraisals', ['current_team' => $this->branchTeam]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/PendingAppraisals')
        );
    }

    public function test_regular_staff_cannot_access_report(): void
    {
        $response = $this->actingAs($this->regularStaff)
            ->get(route('reports.pending-appraisals', ['current_team' => $this->branchTeam]));

        $response->assertStatus(403);
    }

    public function test_report_tracks_pending_360_evaluations_and_remaining_appraisees(): void
    {
        $evaluator = $this->regularStaff;
        $appraisee = User::factory()->create([
            'name' => 'Target Appraisee Bob',
            'email' => 'bob@example.com',
            'current_team_id' => $this->branchTeam->id,
        ]);
        $this->branchTeam->members()->attach($appraisee, ['role' => \App\Enums\TeamRole::Member->value]);

        // Pending 360 evaluation
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle360->id,
            'evaluator_id' => $evaluator->id,
            'evaluatee_id' => $appraisee->id,
            'relationship' => 'peer',
            'status' => 'pending',
        ]);

        $service = app(PendingAppraisalsReportService::class);
        $data = $service->getReportData($this->superAdmin, $this->hqTeam, ['type' => '360']);

        $this->assertNotEmpty($data['users']->items());
        $evaluatorRow = collect($data['users']->items())->firstWhere('user_id', $evaluator->id);

        $this->assertNotNull($evaluatorRow);
        $this->assertEquals(1, $evaluatorRow['total_remaining']);
        $this->assertEquals(0, $evaluatorRow['total_completed']);
        $this->assertCount(1, $evaluatorRow['all_appraisees_remaining']);
        $this->assertContains('Target Appraisee Bob (360)', $evaluatorRow['all_appraisees_remaining']);
    }

    public function test_deadline_cutoff_stops_automated_reminders(): void
    {
        $evaluator = $this->regularStaff;
        $appraisee = User::factory()->create([
            'name' => 'Peer Bob',
            'email' => 'peer.bob@example.com',
            'current_team_id' => $this->branchTeam->id,
        ]);

        // Active cycle with future deadline
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle360->id,
            'evaluator_id' => $evaluator->id,
            'evaluatee_id' => $appraisee->id,
            'relationship' => 'peer',
            'status' => 'pending',
        ]);

        $service = app(PendingAppraisalsReportService::class);

        // Before deadline -> eligible
        $eligibleBefore = $service->getEligibleReminderRecipients();
        $this->assertTrue($eligibleBefore->contains(fn ($item) => $item['user']->id === $evaluator->id));

        // Now expire the cycle deadline (e.g. deadline was yesterday)
        $this->cycle360->update(['evaluation_deadline' => now()->subDay()]);

        // After deadline -> NOT eligible (automated email stops)
        $eligibleAfter = $service->getEligibleReminderRecipients();
        $this->assertFalse($eligibleAfter->contains(fn ($item) => $item['user']->id === $evaluator->id));
    }

    public function test_send_reminders_route_dispatches_notification(): void
    {
        Notification::fake();

        $evaluator = $this->regularStaff;
        $appraisee = User::factory()->create([
            'name' => 'Peer Bob',
            'email' => 'peer.bob2@example.com',
            'current_team_id' => $this->branchTeam->id,
        ]);

        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle360->id,
            'evaluator_id' => $evaluator->id,
            'evaluatee_id' => $appraisee->id,
            'relationship' => 'peer',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('reports.pending-appraisals.send-reminders', ['current_team' => $this->hqTeam]), [
                'user_id' => $evaluator->id,
                'manager_note' => 'Please submit before moderation committee starts tomorrow.',
            ]);

        $response->assertSessionHas('success');
        Notification::assertSentTo($evaluator, PendingAppraisalDailyReminder::class, function ($notification) {
            return $notification->managerNote === 'Please submit before moderation committee starts tomorrow.';
        });
    }

    public function test_artisan_reminders_command_dry_run_executes_successfully(): void
    {
        $this->artisan('appraisals:send-daily-reminders', ['--dry-run' => true])
            ->assertExitCode(0);
    }
}
