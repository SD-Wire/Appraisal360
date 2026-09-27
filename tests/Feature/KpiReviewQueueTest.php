<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Region;
use App\Models\Team;
use App\Models\User;
use App\Services\KpiWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KpiReviewQueueTest extends TestCase
{
    use RefreshDatabase;

    private User $supervisor;
    private User $employee;
    private User $hrbp;
    private Team $team;
    private Department $department;
    private KpiCycle $cycle;
    private KpiWorkflowService $workflow;

    protected function setUp(): void
    {
        parent::setUp();

        $region = Region::create(['name' => 'Nairobi Region', 'code' => 'NRB']);

        $this->team = Team::factory()->create([
            'name' => 'Nairobi HQ',
            'slug' => 'nairobi-hq',
            'region_id' => $region->id,
        ]);

        $this->department = Department::create([
            'team_id' => $this->team->id,
            'name' => 'Credit Operations',
            'code' => 'CRED',
        ]);

        $this->supervisor = User::factory()->create([
            'name' => 'Supervisor Sam',
            'email' => 'supervisor.sam@example.com',
            'department_id' => $this->department->id,
        ]);
        $this->team->members()->attach($this->supervisor, ['role' => \App\Enums\TeamRole::Admin->value]);

        $this->employee = User::factory()->create([
            'name' => 'Officer Jane',
            'email' => 'officer.jane@example.com',
            'supervisor_id' => $this->supervisor->id,
            'department_id' => $this->department->id,
        ]);
        $this->team->members()->attach($this->employee, ['role' => \App\Enums\TeamRole::Member->value]);

        $this->hrbp = User::factory()->create([
            'name' => 'HRBP Grace',
            'email' => 'hrbp.grace@example.com',
        ]);
        $this->team->members()->attach($this->hrbp, ['role' => \App\Enums\TeamRole::Admin->value]);
        $region->hrbps()->attach($this->hrbp);

        $this->cycle = KpiCycle::create([
            'name' => 'FY2026 Appraisal',
            'period_start' => now()->startOfYear()->toDateString(),
            'period_end' => now()->endOfYear()->toDateString(),
            'submission_deadline' => now()->addMonth()->toDateString(),
            'evaluation_deadline' => now()->addMonths(6)->toDateString(),
            'status' => 'open',
            'phase' => 'goal_setting',
        ]);

        $this->workflow = app(KpiWorkflowService::class);
    }

    public function test_supervisor_review_queue_includes_submitted_and_hr_returned_kpis(): void
    {
        // KPI 1: submitted to supervisor
        $kpi1 = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Portfolio Quality Management',
            'description' => 'Maintain PAR under 3%',
            'weight' => 50,
            'status' => 'submitted',
            'current_approver_id' => $this->supervisor->id,
        ]);

        // KPI 2: returned by HRBP with comments to supervisor
        $kpi2 = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Customer Retention Rate',
            'description' => 'Target 95% retention',
            'weight' => 50,
            'status' => 'supervisor_approved',
            'current_approver_id' => null,
        ]);
        $this->workflow->hrReturn($kpi2, $this->hrbp, 'Target formula needs adjustment per company policy.');

        $response = $this->actingAs($this->supervisor)
            ->get(route('kpi.review-queue', ['current_team' => $this->team]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Kpi/ReviewQueue')
            ->has('entries', 2)
            ->where('entries.0.status', 'hr_returned') // hr_returned ordered first
            ->where('entries.0.logs.0.comment', 'Target formula needs adjustment per company policy.')
            ->where('entries.0.logs.0.actor.name', 'HRBP Grace')
        );
    }

    public function test_supervisor_can_view_and_resubmit_hr_returned_kpi(): void
    {
        $kpi = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Customer Retention Rate',
            'description' => 'Target 95% retention',
            'weight' => 50,
            'status' => 'supervisor_approved',
            'current_approver_id' => null,
        ]);
        $this->workflow->hrReturn($kpi, $this->hrbp, 'Please clarify baseline metrics.');

        // Supervisor views review detail page
        $viewResponse = $this->actingAs($this->supervisor)
            ->get(route('kpi.review-show', [
                'current_team' => $this->team,
                'kpiEntry' => $kpi,
            ]));

        $viewResponse->assertOk();
        $viewResponse->assertInertia(fn (Assert $page) => $page
            ->component('Kpi/ReviewDetail')
            ->where('entry.status', 'hr_returned')
            ->where('canReviewAsSupervisor', true)
            ->where('entry.logs.0.comment', 'Please clarify baseline metrics.')
        );

        // Supervisor approves and re-forwards to HR
        $approveResponse = $this->actingAs($this->supervisor)
            ->post(route('kpi.review.supervisor-approve', [
                'current_team' => $this->team,
                'kpiEntry' => $kpi,
            ]), [
                'comment' => 'Metrics clarified and confirmed with staff member.',
            ]);

        $approveResponse->assertRedirect(route('kpi.review-queue', ['current_team' => $this->team]));

        $kpi->refresh();
        $this->assertEquals('supervisor_approved', $kpi->status);

        $this->assertDatabaseHas('kpi_entry_logs', [
            'kpi_entry_id' => $kpi->id,
            'actor_id' => $this->supervisor->id,
            'action' => 'approved',
            'comment' => 'Metrics clarified and confirmed with staff member.',
        ]);
    }
}
