<?php

namespace Tests\Feature;

use App\Support\PermissionsTeam;
use App\Enums\TeamRole;
use App\Models\CoreValue;
use App\Models\CoreValueQuestion;
use App\Models\Department;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyEvaluationRating;
use App\Models\ThreeSixtyStaffAppraisalComment;
use App\Models\ThreeSixtyStaffAppraisalCommentLog;
use App\Models\User;
use App\Services\PerformanceReportService;
use Carbon\Carbon;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ThreeSixtyStaffAppraisalCommentTest extends TestCase
{
    use RefreshDatabase;

    protected User $staff;
    protected User $peer;
    protected User $hrbp;
    protected User $admin;
    protected User $supervisor;
    protected Team $team;
    protected Department $department;
    protected ThreeSixtyCycle $cycle;
    protected CoreValue $coreValue;
    protected CoreValueQuestion $question1;
    protected CoreValueQuestion $question2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->team = Team::factory()->create([
            'name' => 'Head Office',
            'slug' => 'head-office',
            'type' => 'hq',
            'is_personal' => false,
        ]);

        $this->department = Department::create([
            'name' => 'Finance',
            'code' => 'FIN',
            'team_id' => $this->team->id,
        ]);

        $this->supervisor = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Sam Supervisor',
            'email' => 'supervisor@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->supervisor, ['role' => TeamRole::Member->value]);

        $this->staff = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Jane Staff',
            'email' => 'jane@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
            'supervisor_id' => $this->supervisor->id,
        ]);
        $this->team->members()->attach($this->staff, ['role' => TeamRole::Member->value]);

        $this->peer = User::factory()->withoutPersonalTeam()->create([
            'name' => 'John Peer',
            'email' => 'john@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->peer, ['role' => TeamRole::Member->value]);

        $this->hrbp = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Hannah HRBP',
            'email' => 'hrbp@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->hrbp, ['role' => TeamRole::Member->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->hrbp->assignRole('HR Business Partner');

        $this->admin = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Adam Admin',
            'email' => 'admin@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->admin, ['role' => TeamRole::Owner->value]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $this->admin->assignRole('Super Admin');

        $this->coreValue = CoreValue::create([
            'name' => 'Integrity',
            'description' => 'Honesty and ethics',
            'weight' => 50,
            'order' => 1,
            'is_active' => true,
        ]);

        $this->question1 = CoreValueQuestion::create([
            'core_value_id' => $this->coreValue->id,
            'question' => 'Acts with honesty in all dealings',
            'order' => 1,
            'is_active' => true,
        ]);

        $this->question2 = CoreValueQuestion::create([
            'core_value_id' => $this->coreValue->id,
            'question' => 'Demonstrates accountability',
            'order' => 2,
            'is_active' => true,
        ]);

        // Active cycle that has NOT elapsed
        $this->cycle = ThreeSixtyCycle::create([
            'name' => 'Q3 2026 Appraisal',
            'status' => 'open',
            'period_start' => Carbon::now()->subDays(10),
            'period_end' => Carbon::now()->addDays(20),
            'evaluation_deadline' => Carbon::now()->addDays(15),
        ]);

        // Completed evaluation for Jane by John
        $evaluation = ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->peer->id,
            'evaluatee_id' => $this->staff->id,
            'relationship' => 'peer',
            'status' => 'completed',
            'submitted_at' => Carbon::now()->subDays(2),
        ]);

        ThreeSixtyEvaluationRating::create([
            'three_sixty_evaluation_id' => $evaluation->id,
            'core_value_id' => $this->coreValue->id,
            'core_value_question_id' => $this->question1->id,
            'score' => 4,
            'comments' => 'Very honest',
        ]);

        ThreeSixtyEvaluationRating::create([
            'three_sixty_evaluation_id' => $evaluation->id,
            'core_value_id' => $this->coreValue->id,
            'core_value_question_id' => $this->question2->id,
            'score' => 5,
            'comments' => 'Highly accountable',
        ]);
    }

    public function test_cycle_is_not_elapsed_when_deadline_is_in_the_future(): void
    {
        $this->assertFalse($this->cycle->isPeriodElapsed());
    }

    public function test_cycle_is_elapsed_when_deadline_or_period_end_has_passed(): void
    {
        $this->cycle->update([
            'evaluation_deadline' => Carbon::now()->subDay(),
        ]);
        $this->assertTrue($this->cycle->isPeriodElapsed());

        $this->cycle->update([
            'evaluation_deadline' => Carbon::now()->addDays(5),
            'status' => 'closed',
        ]);
        $this->assertTrue($this->cycle->isPeriodElapsed());
    }

    public function test_staff_cannot_submit_comments_before_appraisal_period_elapses(): void
    {
        $response = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'My reflections on the cycle',
            'parameter_comments' => [
                $this->question1->id => 'I agree with this rating',
            ],
            'status' => 'submitted',
        ]);

        $response->assertSessionHasErrors('error');
        $this->assertDatabaseMissing('three_sixty_staff_appraisal_comments', [
            'three_sixty_cycle_id' => $this->cycle->id,
            'user_id' => $this->staff->id,
        ]);
    }

    public function test_staff_cannot_view_detailed_report_before_period_elapses(): void
    {
        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/reports/performance?three_sixty_cycle_id={$this->cycle->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Performance')
            ->where('isThreeSixtyPeriodElapsed', false)
            ->where('detailed360Report', null)
        );
    }

    public function test_hrbp_and_superadmin_can_preview_detailed_report_even_before_period_elapses(): void
    {
        $response = $this->actingAs($this->hrbp)->get("/{$this->team->slug}/reports/performance?three_sixty_cycle_id={$this->cycle->id}&evaluatee_id={$this->staff->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Performance')
            ->where('isThreeSixtyPeriodElapsed', false)
            ->has('detailed360Report')
        );
    }

    public function test_staff_can_view_report_and_save_draft_comments_when_period_elapses(): void
    {
        // Mark cycle period as elapsed
        $this->cycle->update([
            'evaluation_deadline' => Carbon::now()->subMinute(),
        ]);

        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/reports/performance?three_sixty_cycle_id={$this->cycle->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Performance')
            ->where('isThreeSixtyPeriodElapsed', true)
            ->has('detailed360Report')
            ->where('detailed360Report.staff_comment.has_submitted', false)
        );

        // Save draft
        $postResponse = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'Working on my draft comments',
            'parameter_comments' => [
                $this->question1->id => 'Draft comment for parameter 1',
            ],
            'status' => 'draft',
        ]);

        $postResponse->assertSessionHas('success');
        $this->assertDatabaseHas('three_sixty_staff_appraisal_comments', [
            'three_sixty_cycle_id' => $this->cycle->id,
            'user_id' => $this->staff->id,
            'status' => 'draft',
            'overall_comment' => 'Working on my draft comments',
        ]);
    }

    public function test_staff_can_submit_final_comments_which_populate_into_the_report(): void
    {
        $this->cycle->update([
            'status' => 'closed',
        ]);

        $postResponse = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'I thank all peers for their constructive feedback and will focus on accountability.',
            'parameter_comments' => [
                (string) $this->question1->id => 'I appreciate the acknowledgment of my transparency.',
                (string) $this->question2->id => 'I will continue upholding high accountability in finance operations.',
            ],
            'status' => 'submitted',
        ]);

        $postResponse->assertSessionHas('success');

        $this->assertDatabaseHas('three_sixty_staff_appraisal_comments', [
            'three_sixty_cycle_id' => $this->cycle->id,
            'user_id' => $this->staff->id,
            'status' => 'submitted',
        ]);

        // Verify service response contains staff comments on individual questions
        $report = PerformanceReportService::detailedIndividual360Report($this->staff->id, $this->cycle->id);

        $this->assertTrue($report['staff_comment']['has_submitted']);
        $this->assertEquals('submitted', $report['staff_comment']['status']);
        $this->assertEquals('I thank all peers for their constructive feedback and will focus on accountability.', $report['staff_comment']['overall_comment']);

        // Check parameter questions staff comments
        $questions = $report['sections'][0]['questions'];
        $this->assertEquals('I appreciate the acknowledgment of my transparency.', $questions[0]['staff_comment']);
        $this->assertEquals('I will continue upholding high accountability in finance operations.', $questions[1]['staff_comment']);

        // Verify inertia response returns the submitted comments and overall rank
        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/reports/performance?three_sixty_cycle_id={$this->cycle->id}");
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Performance')
            ->where('detailed360Report.staff_comment.has_submitted', true)
            ->where('detailed360Report.sections.0.questions.0.staff_comment', 'I appreciate the acknowledgment of my transparency.')
            ->where('detailed360Report.overall_rank', 1)
            ->where('detailed360Report.total_staff_ranked', 1)
        );
    }

    public function test_submission_is_blocked_if_any_parameter_comment_is_missing(): void
    {
        $this->cycle->update([
            'status' => 'closed',
        ]);

        // Submit with only 1 parameter comment (question 2 is missing)
        $response = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'My overall comment is here',
            'parameter_comments' => [
                (string) $this->question1->id => 'Comment for Q1 only',
            ],
            'status' => 'submitted',
        ]);

        $response->assertSessionHasErrors('error');
        $this->assertDatabaseMissing('three_sixty_staff_appraisal_comments', [
            'three_sixty_cycle_id' => $this->cycle->id,
            'user_id' => $this->staff->id,
            'status' => 'submitted',
        ]);
    }

    public function test_submission_is_blocked_if_overall_comment_is_missing(): void
    {
        $this->cycle->update([
            'status' => 'closed',
        ]);

        // Submit with all parameter comments but empty overall comment
        $response = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => '',
            'parameter_comments' => [
                (string) $this->question1->id => 'Comment for Q1',
                (string) $this->question2->id => 'Comment for Q2',
            ],
            'status' => 'submitted',
        ]);

        $response->assertSessionHasErrors('error');
        $this->assertDatabaseMissing('three_sixty_staff_appraisal_comments', [
            'three_sixty_cycle_id' => $this->cycle->id,
            'user_id' => $this->staff->id,
            'status' => 'submitted',
        ]);
    }

    public function test_detailed_report_correctly_ranks_multiple_staff(): void
    {
        $this->cycle->update([
            'status' => 'closed',
        ]);

        // Create a second evaluated staff member with lower scores
        $secondStaff = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Bob LowScore',
            'email' => 'bob@example.com',
            'department_id' => $this->department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($secondStaff, ['role' => TeamRole::Member->value]);

        $eval2 = ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluator_id' => $this->peer->id,
            'evaluatee_id' => $secondStaff->id,
            'relationship' => 'peer',
            'status' => 'completed',
            'submitted_at' => Carbon::now()->subDays(1),
        ]);

        ThreeSixtyEvaluationRating::create([
            'three_sixty_evaluation_id' => $eval2->id,
            'core_value_id' => $this->coreValue->id,
            'core_value_question_id' => $this->question1->id,
            'score' => 2,
        ]);
        ThreeSixtyEvaluationRating::create([
            'three_sixty_evaluation_id' => $eval2->id,
            'core_value_id' => $this->coreValue->id,
            'core_value_question_id' => $this->question2->id,
            'score' => 2,
        ]);

        // Jane has score 4 and 5 (avg 4.5) -> Rank #1
        $janeReport = PerformanceReportService::detailedIndividual360Report($this->staff->id, $this->cycle->id);
        $this->assertEquals(1, $janeReport['overall_rank']);
        $this->assertEquals(2, $janeReport['total_staff_ranked']);
        $this->assertEquals(1, $janeReport['totals']['weighted_rank']);

        // Bob has score 2 and 2 (avg 2.0) -> Rank #2
        $bobReport = PerformanceReportService::detailedIndividual360Report($secondStaff->id, $this->cycle->id);
        $this->assertEquals(2, $bobReport['overall_rank']);
        $this->assertEquals(2, $bobReport['total_staff_ranked']);
        $this->assertEquals(2, $bobReport['totals']['weighted_rank']);
    }

    public function test_staff_cannot_edit_comments_once_submitted(): void
    {
        $this->cycle->update(['status' => 'closed']);

        // Submit initial comment
        $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'Initial submitted reflection',
            'parameter_comments' => [
                (string) $this->question1->id => 'Comment 1',
                (string) $this->question2->id => 'Comment 2',
            ],
            'status' => 'submitted',
        ])->assertSessionHas('success');

        // Staff tries to edit and resubmit
        $response = $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'Staff trying to modify submitted comments',
            'parameter_comments' => [
                (string) $this->question1->id => 'Modified 1',
                (string) $this->question2->id => 'Modified 2',
            ],
            'status' => 'submitted',
        ]);

        $response->assertSessionHasErrors('error');

        // Verify the original comment was unchanged
        $comment = ThreeSixtyStaffAppraisalComment::where('user_id', $this->staff->id)
            ->where('three_sixty_cycle_id', $this->cycle->id)
            ->first();

        $this->assertEquals('Initial submitted reflection', $comment->overall_comment);
    }

    public function test_supervisor_hrbp_and_super_admin_can_edit_comments_after_submission_with_audit_trail(): void
    {
        $this->cycle->update(['status' => 'closed']);

        // Staff submits initial comments
        $this->actingAs($this->staff)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'overall_comment' => 'Staff original reflection',
            'parameter_comments' => [
                (string) $this->question1->id => 'Comment 1',
                (string) $this->question2->id => 'Comment 2',
            ],
            'status' => 'submitted',
        ]);

        $comment = ThreeSixtyStaffAppraisalComment::where('user_id', $this->staff->id)
            ->where('three_sixty_cycle_id', $this->cycle->id)
            ->first();

        $this->assertNotNull($comment);

        // 1. Immediate supervisor edits the comment
        $supResponse = $this->actingAs($this->supervisor)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluatee_id' => $this->staff->id,
            'overall_comment' => 'Supervisor reviewed and adjusted reflection',
            'parameter_comments' => [
                (string) $this->question1->id => 'Supervisor note 1',
                (string) $this->question2->id => 'Supervisor note 2',
            ],
            'status' => 'submitted',
        ]);

        $supResponse->assertSessionHas('success');
        $comment->refresh();
        $this->assertEquals('Supervisor reviewed and adjusted reflection', $comment->overall_comment);

        // Check audit log for supervisor
        $this->assertDatabaseHas('three_sixty_staff_appraisal_comment_logs', [
            'comment_id' => $comment->id,
            'actor_id' => $this->supervisor->id,
            'actor_role' => 'Supervisor',
            'action' => 'edited_by_supervisor',
        ]);

        // 2. HRBP edits the comment
        $hrbpResponse = $this->actingAs($this->hrbp)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluatee_id' => $this->staff->id,
            'overall_comment' => 'HRBP endorsed and finalized comments',
            'parameter_comments' => [
                (string) $this->question1->id => 'HRBP note 1',
                (string) $this->question2->id => 'HRBP note 2',
            ],
            'status' => 'submitted',
        ]);

        $hrbpResponse->assertSessionHas('success');
        $comment->refresh();
        $this->assertEquals('HRBP endorsed and finalized comments', $comment->overall_comment);

        // Check audit log for HRBP
        $this->assertDatabaseHas('three_sixty_staff_appraisal_comment_logs', [
            'comment_id' => $comment->id,
            'actor_id' => $this->hrbp->id,
            'actor_role' => 'HR Business Partner',
            'action' => 'edited_by_hrbp',
        ]);

        // 3. Super Admin edits the comment
        $adminResponse = $this->actingAs($this->admin)->post("/{$this->team->slug}/reports/three-sixty/staff-comment", [
            'three_sixty_cycle_id' => $this->cycle->id,
            'evaluatee_id' => $this->staff->id,
            'overall_comment' => 'Super Admin administrative update',
            'parameter_comments' => [
                (string) $this->question1->id => 'Admin note 1',
                (string) $this->question2->id => 'Admin note 2',
            ],
            'status' => 'submitted',
        ]);

        $adminResponse->assertSessionHas('success');
        $comment->refresh();
        $this->assertEquals('Super Admin administrative update', $comment->overall_comment);

        // Check audit log for Admin
        $this->assertDatabaseHas('three_sixty_staff_appraisal_comment_logs', [
            'comment_id' => $comment->id,
            'actor_id' => $this->admin->id,
            'actor_role' => 'Super Admin',
            'action' => 'edited_by_admin',
        ]);
    }

    public function test_detailed_report_contains_sign_off_with_regional_hrbp_presigned(): void
    {
        $this->cycle->update(['status' => 'closed']);

        $report = PerformanceReportService::detailedIndividual360Report($this->staff->id, $this->cycle->id);

        $this->assertArrayHasKey('sign_off', $report);
        $this->assertArrayHasKey('staff', $report['sign_off']);
        $this->assertArrayHasKey('supervisor', $report['sign_off']);
        $this->assertArrayHasKey('hrbp', $report['sign_off']);

        // Staff details
        $this->assertEquals($this->staff->name, $report['sign_off']['staff']['name']);
        $this->assertEquals('Head Office', $report['sign_off']['staff']['team']);
        $this->assertEquals('Head Office', $report['user']['team_name']);

        // Supervisor details
        $this->assertEquals($this->supervisor->name, $report['sign_off']['supervisor']['name']);

        // Regional HRBP pre-signed
        $this->assertTrue($report['sign_off']['hrbp']['is_presigned']);
        $this->assertNotEmpty($report['sign_off']['hrbp']['stamp_code']);
        $this->assertStringStartsWith('HRBP-PRESIGN-', $report['sign_off']['hrbp']['stamp_code']);
    }

    public function test_detailed_report_resolves_branch_staff_team_for_report_title(): void
    {
        $this->cycle->update(['status' => 'closed']);

        $branchTeam = Team::factory()->create([
            'name' => 'Eldoret Branch',
            'slug' => 'eldoret-branch',
            'type' => 'branch',
            'is_personal' => false,
        ]);

        $branchStaff = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Brian Branch',
            'email' => 'brian@example.com',
            'current_team_id' => $branchTeam->id,
        ]);
        $branchTeam->members()->attach($branchStaff, ['role' => TeamRole::Member->value]);

        $report = PerformanceReportService::detailedIndividual360Report($branchStaff->id, $this->cycle->id);

        $this->assertEquals('Eldoret Branch', $report['user']['team_name']);
        $this->assertEquals('Eldoret Branch', $report['sign_off']['staff']['team']);
    }
}
