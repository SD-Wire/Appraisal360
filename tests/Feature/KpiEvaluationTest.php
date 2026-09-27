<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KpiEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private User $supervisor;
    private User $employee;
    private Team $team;
    private Department $department;
    private KpiCycle $cycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->team = Team::factory()->create(['name' => 'HQ Branch', 'slug' => 'hq-branch']);

        $this->department = Department::create([
            'team_id' => $this->team->id,
            'name' => 'Finance Department',
            'code' => 'FIN',
        ]);

        $this->supervisor = User::factory()->create([
            'name' => 'Supervisor User',
            'email' => 'supervisor@example.com',
            'department_id' => $this->department->id,
        ]);
        $this->team->members()->attach($this->supervisor, ['role' => \App\Enums\TeamRole::Admin->value]);

        $this->employee = User::factory()->create([
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'supervisor_id' => $this->supervisor->id,
            'department_id' => $this->department->id,
        ]);
        $this->team->members()->attach($this->employee, ['role' => \App\Enums\TeamRole::Member->value]);

        $this->cycle = KpiCycle::create([
            'name' => 'FY2026 Appraisal',
            'period_start' => now()->subMonths(3)->toDateString(),
            'period_end' => now()->toDateString(),
            'submission_deadline' => now()->subMonth()->toDateString(),
            'evaluation_deadline' => now()->addMonth()->toDateString(),
            'status' => 'open',
            'phase' => 'evaluation',
        ]);
    }

    public function test_user_can_view_evaluation_page_in_evaluation_phase(): void
    {
        KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'weight' => 100,
            'status' => 'hr_approved',
            'evaluation_status' => 'pending',
        ]);

        $response = $this->actingAs($this->employee)
            ->get(route('kpi.evaluation.index', ['current_team' => $this->team]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Kpi/MyEvaluation')
            ->has('entries', 1)
            ->where('entries.0.title', 'Disburse Loans Target')
            ->where('canSubmit', false)
        );
    }

    public function test_user_can_save_kpi_self_score_and_comment(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'weight' => 100,
            'status' => 'hr_approved',
            'evaluation_status' => 'pending',
        ]);

        $response = $this->actingAs($this->employee)
            ->put(route('kpi.evaluation.save', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]), [
                'self_rating' => 4,
                'actual_result' => 'Achieved KES 5.2M disbursement',
                'self_comment' => 'Exceeded targets through effective SME customer engagement.',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('kpi_entries', [
            'id' => $entry->id,
            'self_rating' => 4,
            'actual_result' => 'Achieved KES 5.2M disbursement',
            'self_comment' => 'Exceeded targets through effective SME customer engagement.',
        ]);
    }

    public function test_user_cannot_save_without_required_comment_and_actual_result(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'weight' => 100,
            'status' => 'hr_approved',
            'evaluation_status' => 'pending',
        ]);

        $response = $this->actingAs($this->employee)
            ->put(route('kpi.evaluation.save', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]), [
                'self_rating' => 4,
                'actual_result' => '',
                'self_comment' => '',
            ]);

        $response->assertSessionHasErrors(['actual_result', 'self_comment']);
    }

    public function test_user_can_submit_completed_evaluation_to_supervisor(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'actual_result' => 'Achieved KES 5.2M disbursement',
            'weight' => 100,
            'self_rating' => 4,
            'self_comment' => 'Exceeded targets through effective SME customer engagement.',
            'status' => 'hr_approved',
            'evaluation_status' => 'pending',
        ]);

        $response = $this->actingAs($this->employee)
            ->post(route('kpi.evaluation.submit', [
                'current_team' => $this->team,
            ]));

        $response->assertRedirect(route('kpi.evaluation.index', ['current_team' => $this->team]));

        $entry->refresh();
        $this->assertEquals('self_submitted', $entry->evaluation_status);
        $this->assertEquals($this->supervisor->id, $entry->current_approver_id);
        $this->assertNotNull($entry->evaluation_submitted_at);

        $this->assertDatabaseHas('kpi_entry_logs', [
            'kpi_entry_id' => $entry->id,
            'actor_id' => $this->employee->id,
            'stage' => 'evaluation',
            'action' => 'self_submitted',
        ]);
    }

    public function test_supervisor_can_view_review_queue_and_detail(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'actual_result' => 'Achieved KES 5.2M disbursement',
            'weight' => 100,
            'self_rating' => 4,
            'self_comment' => 'Exceeded targets through effective SME customer engagement.',
            'status' => 'hr_approved',
            'evaluation_status' => 'self_submitted',
            'current_approver_id' => $this->supervisor->id,
            'evaluation_submitted_at' => now(),
        ]);

        $queueResponse = $this->actingAs($this->supervisor)
            ->get(route('kpi.evaluation.review-queue', ['current_team' => $this->team]));

        $queueResponse->assertOk();
        $queueResponse->assertInertia(fn (Assert $page) => $page
            ->component('Kpi/EvaluationReviewQueue')
            ->has('reviews', 1)
            ->where('reviews.0.user.id', $this->employee->id)
            ->where('reviews.0.kpi_count', 1)
        );

        $detailResponse = $this->actingAs($this->supervisor)
            ->get(route('kpi.evaluation.review-show', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]));

        $detailResponse->assertOk();
        $detailResponse->assertInertia(fn (Assert $page) => $page
            ->component('Kpi/EvaluationReviewDetail')
            ->where('staffMember.id', $this->employee->id)
            ->has('entries', 1)
            ->where('entries.0.id', $entry->id)
        );
    }

    public function test_supervisor_can_moderate_kpi_score_and_comment(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'actual_result' => 'Achieved KES 5.2M disbursement',
            'weight' => 100,
            'self_rating' => 5,
            'self_comment' => 'I feel I did an outstanding job.',
            'status' => 'hr_approved',
            'evaluation_status' => 'self_submitted',
            'current_approver_id' => $this->supervisor->id,
            'evaluation_submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->supervisor)
            ->post(route('kpi.evaluation.supervisor-approve', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]), [
                'supervisor_rating' => 4,
                'comment' => 'Good performance overall. Moderated to 4 as portfolio at risk had minor spikes.',
            ]);

        $response->assertRedirect(route('kpi.evaluation.review-queue', ['current_team' => $this->team]));

        $entry->refresh();
        $this->assertEquals('completed', $entry->evaluation_status);
        $this->assertEquals(4, $entry->supervisor_rating);
        $this->assertEquals('Good performance overall. Moderated to 4 as portfolio at risk had minor spikes.', $entry->supervisor_comment);
        $this->assertNull($entry->current_approver_id);

        $this->assertDatabaseHas('kpi_entry_logs', [
            'kpi_entry_id' => $entry->id,
            'actor_id' => $this->supervisor->id,
            'stage' => 'evaluation',
            'action' => 'supervisor_approved',
            'comment' => 'Good performance overall. Moderated to 4 as portfolio at risk had minor spikes.',
        ]);
    }

    public function test_supervisor_can_return_kpi_with_comment_for_revision(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'actual_result' => '4,000,000',
            'weight' => 100,
            'self_rating' => 4,
            'self_comment' => 'Good effort.',
            'status' => 'hr_approved',
            'evaluation_status' => 'self_submitted',
            'current_approver_id' => $this->supervisor->id,
            'evaluation_submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->supervisor)
            ->post(route('kpi.evaluation.supervisor-return', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]), [
                'comment' => 'Please provide more details on actual portfolio metrics and revise score.',
            ]);

        $response->assertRedirect(route('kpi.evaluation.review-queue', ['current_team' => $this->team]));

        $entry->refresh();
        $this->assertEquals('supervisor_returned', $entry->evaluation_status);
        $this->assertNull($entry->supervisor_rating);
        $this->assertEquals('Please provide more details on actual portfolio metrics and revise score.', $entry->supervisor_comment);
        $this->assertEquals($this->employee->id, $entry->current_approver_id);

        $this->assertDatabaseHas('kpi_entry_logs', [
            'kpi_entry_id' => $entry->id,
            'actor_id' => $this->supervisor->id,
            'stage' => 'evaluation',
            'action' => 'supervisor_returned',
            'comment' => 'Please provide more details on actual portfolio metrics and revise score.',
        ]);
    }

    public function test_supervisor_can_edit_moderated_score_on_completed_kpi(): void
    {
        $entry = KpiEntry::create([
            'kpi_cycle_id' => $this->cycle->id,
            'user_id' => $this->employee->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Disburse Loans Target',
            'description' => 'Target disbursement of KES 5M',
            'target' => '5,000,000',
            'actual_result' => 'Achieved KES 5.2M disbursement',
            'weight' => 100,
            'self_rating' => 4,
            'self_comment' => 'Good work.',
            'supervisor_rating' => 4,
            'supervisor_comment' => 'Initial moderation score.',
            'status' => 'hr_approved',
            'evaluation_status' => 'completed',
            'current_approver_id' => null,
            'evaluation_submitted_at' => now(),
        ]);

        // Supervisor views the review page of an already moderated KPI
        $viewResponse = $this->actingAs($this->supervisor)
            ->get(route('kpi.evaluation.review-show', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]));

        $viewResponse->assertOk();

        // Supervisor edits score during moderation
        $response = $this->actingAs($this->supervisor)
            ->post(route('kpi.evaluation.supervisor-approve', [
                'current_team' => $this->team,
                'kpiEntry' => $entry,
            ]), [
                'supervisor_rating' => 5,
                'comment' => 'Re-moderated to 5 after reviewing final audited figures.',
            ]);

        $response->assertRedirect(route('kpi.evaluation.review-show', [
            'current_team' => $this->team,
            'kpiEntry' => $entry,
        ]));

        $entry->refresh();
        $this->assertEquals('completed', $entry->evaluation_status);
        $this->assertEquals(5, $entry->supervisor_rating);
        $this->assertEquals('Re-moderated to 5 after reviewing final audited figures.', $entry->supervisor_comment);

        $this->assertDatabaseHas('kpi_entry_logs', [
            'kpi_entry_id' => $entry->id,
            'actor_id' => $this->supervisor->id,
            'stage' => 'evaluation',
            'action' => 'supervisor_approved',
            'comment' => 'Re-moderated to 5 after reviewing final audited figures.',
        ]);
    }

    public function test_branch_staff_without_department_can_create_kpi_entry(): void
    {
        $branchStaff = User::factory()->create([
            'name' => 'Branch Staff User',
            'email' => 'branchstaff@example.com',
            'department_id' => null,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($branchStaff, ['role' => \App\Enums\TeamRole::Member->value]);

        $registrar = app(\Spatie\Permission\PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($this->team->id);
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'kpi.capture', 'guard_name' => 'web']);
        $branchStaff->givePermissionTo($permission);

        $response = $this->actingAs($branchStaff)
            ->post(route('kpi.store', ['current_team' => $this->team]), [
                'kpi_cycle_id' => $this->cycle->id,
                'title' => 'Policy implementation',
                'description' => 'Policy implementation details',
                'target' => '100',
                'weight' => 50,
            ]);

        $response->assertRedirect(route('kpi.index', ['current_team' => $this->team]));

        $this->assertDatabaseHas('kpi_entries', [
            'user_id' => $branchStaff->id,
            'kpi_cycle_id' => $this->cycle->id,
            'title' => 'Policy implementation',
            'department_id' => null,
            'status' => 'draft',
        ]);
    }

    public function test_cannot_create_kpi_when_cycle_weight_reaches_100_percent(): void
    {
        $registrar = app(\Spatie\Permission\PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($this->team->id);
        $permission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'kpi.capture', 'guard_name' => 'web']);
        $this->employee->givePermissionTo($permission);

        // Employee has existing KPI with 100% weight
        KpiEntry::create([
            'user_id' => $this->employee->id,
            'kpi_cycle_id' => $this->cycle->id,
            'team_id' => $this->team->id,
            'department_id' => $this->department->id,
            'title' => 'Full Weight KPI',
            'description' => 'Target achieved already',
            'weight' => 100,
            'status' => 'draft',
        ]);

        // Attempting to visit create page redirects back with error
        $createResponse = $this->actingAs($this->employee)
            ->get(route('kpi.create', ['current_team' => $this->team]));

        $createResponse->assertRedirect(route('kpi.index', ['current_team' => $this->team]));
        $createResponse->assertSessionHas('error');

        // Attempting to store another KPI fails validation
        $storeResponse = $this->actingAs($this->employee)
            ->post(route('kpi.store', ['current_team' => $this->team]), [
                'kpi_cycle_id' => $this->cycle->id,
                'title' => 'Exceeding KPI',
                'description' => 'Should be blocked',
                'target' => '50',
                'weight' => 10,
            ]);

        $storeResponse->assertSessionHasErrors(['weight']);
    }
}

