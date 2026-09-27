<?php

namespace Tests\Feature;

use App\Models\CoreValue;
use App\Models\CoreValueQuestion;
use App\Models\Department;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyEvaluationRating;
use App\Models\User;
use App\Support\PermissionsTeam;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ThreeSixtyFeedbackReportTest extends TestCase
{
    use RefreshDatabase;

    private Region $region;
    private Team $team;
    private Department $department;
    private User $superAdmin;
    private User $hrbp;
    private User $regularStaff;
    private User $supervisor;
    private ThreeSixtyCycle $cycle;
    private CoreValue $coreValue;
    private CoreValueQuestion $question;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->region = Region::create([
            'name' => 'Nairobi Region',
            'code' => 'NRB',
        ]);

        $this->team = Team::factory()->create([
            'name' => 'HQ Team',
            'slug' => 'hq-team',
            'type' => 'hq',
            'region_id' => $this->region->id,
            'is_personal' => false,
        ]);

        $this->department = Department::create([
            'team_id' => $this->team->id,
            'name' => 'Human Resources',
            'code' => 'HR',
        ]);

        // Regular Staff
        $this->regularStaff = User::factory()->create([
            'name' => 'Regular Staff',
            'email' => 'regular@example.com',
            'department_id' => $this->department->id,
        ]);
        $this->regularStaff->update(['current_team_id' => $this->team->id]);
        $this->team->members()->attach($this->regularStaff, ['role' => \App\Enums\TeamRole::Member->value]);

        // Supervisor
        $this->supervisor = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Supervisor User',
            'email' => 'supervisor@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->supervisor, ['role' => \App\Enums\TeamRole::Admin->value]);

        // Super Admin
        $this->superAdmin = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Super Admin User',
            'email' => 'admin@example.com',
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->superAdmin, ['role' => \App\Enums\TeamRole::Owner->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->superAdmin->assignRole('Super Admin');

        // HRBP
        $this->hrbp = User::factory()->withoutPersonalTeam()->create([
            'name' => 'HRBP User',
            'email' => 'hrbp@example.com',
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->hrbp, ['role' => \App\Enums\TeamRole::Member->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->hrbp->assignRole('HR Business Partner');

        // 360 Cycle
        $this->cycle = ThreeSixtyCycle::create([
            'name' => '2026 Annual 360 Review',
            'period_start' => now()->startOfYear(),
            'period_end' => now()->endOfYear(),
            'evaluation_deadline' => now()->addMonth(),
            'status' => 'open',
        ]);

        // Core Value & Question
        $this->coreValue = CoreValue::create([
            'name' => 'Integrity',
            'description' => 'Uncompromising adherence to ethical standards.',
            'weight' => 25,
            'order' => 1,
            'is_active' => true,
        ]);

        $this->question = CoreValueQuestion::create([
            'core_value_id' => $this->coreValue->id,
            'question' => 'Consistently acts with honesty and transparency.',
            'description' => 'Is truthful with customers and protects confidential data.',
            'weight' => 25,
            'min_score' => 1,
            'max_score' => 5,
            'order' => 1,
            'is_active' => true,
        ]);
    }

    public function test_guests_cannot_view_feedback_summary_report(): void
    {
        $response = $this->get(route('reports.feedback-summary', ['current_team' => $this->team->slug]));

        $response->assertRedirect(route('login'));
    }

    public function test_regular_employees_are_forbidden_from_viewing_feedback_summary_report(): void
    {
        $response = $this->actingAs($this->regularStaff)
            ->get(route('reports.feedback-summary', ['current_team' => $this->team->slug]));

        $response->assertStatus(403);
    }

    public function test_supervisors_without_hrbp_or_superadmin_role_are_forbidden(): void
    {
        $response = $this->actingAs($this->supervisor)
            ->get(route('reports.feedback-summary', ['current_team' => $this->team->slug]));

        $response->assertStatus(403);
    }

    public function test_super_admin_can_view_feedback_summary_report(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', ['current_team' => $this->team->slug]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/FeedbackSummary')
            ->has('cycles')
            ->has('regions')
            ->has('departments')
            ->has('branches')
            ->has('stats')
            ->has('evaluatees')
            ->has('coreValues')
        );
    }

    public function test_hrbp_can_view_feedback_summary_report(): void
    {
        $response = $this->actingAs($this->hrbp)
            ->get(route('reports.feedback-summary', ['current_team' => $this->team->slug]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/FeedbackSummary')
            ->has('cycles')
            ->has('stats')
            ->has('evaluatees')
        );
    }

    public function test_report_accurately_returns_paginated_feedback_summary_and_anonymous_question_comments(): void
    {
        // Create an evaluation with feedback summary & core value comments
        $evaluation = ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->supervisor->id,
            'evaluatee_id' => $this->regularStaff->id,
            'relationship_type' => 'supervisor_to_subordinate',
            'status' => 'completed',
            'score' => 4.5,
            'feedback_summary' => 'Demonstrates exemplary leadership and problem solving.',
            'core_value_comments' => [
                $this->coreValue->id => 'Maintains high ethical standards and inspires trust.',
            ],
            'submitted_at' => now(),
        ]);

        ThreeSixtyEvaluationRating::create([
            'three_sixty_evaluation_id' => $evaluation->id,
            'core_value_id' => $this->coreValue->id,
            'core_value_question_id' => $this->question->id,
            'score' => 5,
            'comment' => 'Honest communication under pressure.',
        ]);

        $response = $this->actingAs($this->hrbp)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
            ]));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/FeedbackSummary')
            ->where('stats.total_evaluatees_reviewed', 1)
            ->where('stats.total_evaluations', 1)
            ->where('stats.total_feedback_summaries', 1)
            ->where('stats.total_core_value_comments', 1)
            ->where('stats.total_question_comments', 1)
            // Evaluator name must NOT be present (anonymity preserved)
            ->where('evaluatees.data.0.user.name', $this->regularStaff->name)
            ->where('evaluatees.data.0.feedback_summaries.0.feedback_summary', 'Demonstrates exemplary leadership and problem solving.')
            ->where('evaluatees.data.0.feedback_summaries.0.reviewer_label', 'Reviewer 1 (Immediate Supervisor)')
            ->where('evaluatees.data.0.core_values.0.supervisor_comments.0.comment', 'Maintains high ethical standards and inspires trust.')
            ->where('evaluatees.data.0.core_values.0.questions.0.comments.0.comment', 'Honest communication under pressure.')
            ->where('evaluatees.data.0.core_values.0.questions.0.comments.0.reviewer_label', 'Reviewer 1 (Immediate Supervisor)')
            ->where('evaluatees.current_page', 1)
            ->where('evaluatees.total', 1)
        );
    }

    public function test_report_filtering_per_individual_branch_department_and_region(): void
    {
        // Create second region & branch
        $westernRegion = Region::create(['name' => 'Western Region', 'code' => 'WST']);
        $kisumuBranch = Team::factory()->create([
            'name' => 'Kisumu Branch',
            'slug' => 'kisumu-branch',
            'type' => 'branch',
            'region_id' => $westernRegion->id,
            'is_personal' => false,
        ]);
        $salesDept = Department::create([
            'team_id' => $kisumuBranch->id,
            'name' => 'Sales & Credit',
            'code' => 'SALES',
        ]);

        $westernStaff = User::factory()->create([
            'name' => 'Western Staff User',
            'department_id' => $salesDept->id,
        ]);
        $westernStaff->update(['current_team_id' => $kisumuBranch->id]);
        $kisumuBranch->members()->attach($westernStaff, ['role' => \App\Enums\TeamRole::Member->value]);

        // Western Staff Evaluation
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->supervisor->id,
            'evaluatee_id' => $westernStaff->id,
            'relationship_type' => 'supervisor_to_subordinate',
            'status' => 'completed',
            'score' => 4.2,
            'feedback_summary' => 'Great sales performance and relationship building.',
            'submitted_at' => now(),
        ]);

        // Nairobi Staff Evaluation
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->supervisor->id,
            'evaluatee_id' => $this->regularStaff->id,
            'relationship_type' => 'branch_peer',
            'status' => 'completed',
            'score' => 3.8,
            'feedback_summary' => 'Solid team player in HR.',
            'submitted_at' => now(),
        ]);

        // 1. Filter per Region (Western Region)
        $resRegion = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
                'region_id' => $westernRegion->id,
            ]));
        $resRegion->assertOk();
        $resRegion->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_evaluatees_reviewed', 1)
            ->where('evaluatees.data.0.user.name', 'Western Staff User')
        );

        // 2. Filter per Branch (Kisumu Branch)
        $resBranch = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
                'team_id' => $kisumuBranch->id,
            ]));
        $resBranch->assertOk();
        $resBranch->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_evaluatees_reviewed', 1)
            ->where('evaluatees.data.0.user.name', 'Western Staff User')
        );

        // 3. Filter per Department (Human Resources)
        $resDept = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
                'department_id' => $this->department->id,
            ]));
        $resDept->assertOk();
        $resDept->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_evaluatees_reviewed', 1)
            ->where('evaluatees.data.0.user.name', $this->regularStaff->name)
        );

        // 4. Filter per Individual (Western Staff)
        $resIndividual = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
                'evaluatee_id' => $westernStaff->id,
            ]));
        $resIndividual->assertOk();
        $resIndividual->assertInertia(fn (Assert $page) => $page
            ->where('stats.total_evaluatees_reviewed', 1)
            ->where('evaluatees.data.0.user.name', 'Western Staff User')
        );
    }

    public function test_export_all_json_endpoint(): void
    {
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->supervisor->id,
            'evaluatee_id' => $this->regularStaff->id,
            'relationship_type' => 'supervisor_to_subordinate',
            'status' => 'completed',
            'score' => 4.5,
            'feedback_summary' => 'Export test feedback.',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('reports.feedback-summary', [
                'current_team' => $this->team->slug,
                'cycle_id' => $this->cycle->id,
                'export' => 'all',
            ]));

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.user.name', $this->regularStaff->name);
        $response->assertJsonPath('0.feedback_summaries.0.reviewer_label', 'Reviewer 1 (Immediate Supervisor)');
    }
}
