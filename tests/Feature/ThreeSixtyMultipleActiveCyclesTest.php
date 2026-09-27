<?php

namespace Tests\Feature;

use App\Models\CoreValue;
use App\Models\CoreValueQuestion;
use App\Models\Department;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ThreeSixtyMultipleActiveCyclesTest extends TestCase
{
    use RefreshDatabase;

    private Team $team;
    private User $staff;
    private User $colleague1;
    private User $colleague2;
    private ThreeSixtyCycle $cycle1;
    private ThreeSixtyCycle $cycle2;
    private CoreValue $coreValue;
    private CoreValueQuestion $question;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->team = Team::factory()->create([
            'name' => 'HQ Team',
            'slug' => 'hq-team',
            'type' => 'hq',
            'is_personal' => false,
        ]);

        $department = Department::create([
            'team_id' => $this->team->id,
            'name' => 'Finance',
            'code' => 'FIN',
        ]);

        $this->staff = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Alice Evaluator',
            'email' => 'alice@example.com',
            'department_id' => $department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->staff, ['role' => \App\Enums\TeamRole::Member->value]);

        $this->colleague1 = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Bob Peer',
            'email' => 'bob@example.com',
            'department_id' => $department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->colleague1, ['role' => \App\Enums\TeamRole::Member->value]);

        $this->colleague2 = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Charlie Peer',
            'email' => 'charlie@example.com',
            'department_id' => $department->id,
            'current_team_id' => $this->team->id,
        ]);
        $this->team->members()->attach($this->colleague2, ['role' => \App\Enums\TeamRole::Member->value]);

        // Create 2 concurrent active cycles
        $this->cycle1 = ThreeSixtyCycle::create([
            'name' => 'Q1 2026 360 Appraisal',
            'period_start' => now()->subDays(10)->toDateString(),
            'period_end' => now()->addDays(20)->toDateString(),
            'evaluation_deadline' => now()->addDays(15)->toDateString(),
            'status' => 'open',
        ]);

        $this->cycle2 = ThreeSixtyCycle::create([
            'name' => 'Mid-Year Core Values 360',
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->addDays(30)->toDateString(),
            'evaluation_deadline' => now()->addDays(25)->toDateString(),
            'status' => 'open',
        ]);

        $this->coreValue = CoreValue::create([
            'name' => 'Integrity',
            'description' => 'Acts with honesty and integrity',
            'weight' => 100,
            'order' => 1,
            'is_active' => true,
        ]);

        $this->question = CoreValueQuestion::create([
            'core_value_id' => $this->coreValue->id,
            'question' => 'Demonstrates ethical behavior in all decisions',
            'order' => 1,
            'is_active' => true,
        ]);

        // Assign evaluations:
        // In cycle1: Alice evaluates Bob (completed)
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle1->id,
            'evaluator_id' => $this->staff->id,
            'evaluatee_id' => $this->colleague1->id,
            'relationship_type' => 'department_peer',
            'status' => 'completed',
            'score' => 4.5,
        ]);

        // In cycle2: Alice evaluates Charlie (pending)
        ThreeSixtyEvaluation::create([
            'three_sixty_cycle_id' => $this->cycle2->id,
            'evaluator_id' => $this->staff->id,
            'evaluatee_id' => $this->colleague2->id,
            'relationship_type' => 'department_peer',
            'status' => 'pending',
        ]);
    }

    public function test_my_evaluations_returns_multiple_active_cycles(): void
    {
        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/three-sixty/evaluations");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('three-sixty/MyEvaluations')
            ->has('activeCycles', 2)
            ->where('activeCycles.0.name', 'Mid-Year Core Values 360')
            ->where('activeCycles.1.name', 'Q1 2026 360 Appraisal')
        );
    }

    public function test_default_cycle_prioritizes_active_cycle_with_pending_evaluations(): void
    {
        // When Alice visits without query param, cycle2 has a pending evaluation while cycle1 is completed.
        // It should automatically select cycle2 (where Alice has action required).
        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/three-sixty/evaluations");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('three-sixty/MyEvaluations')
            ->where('cycle.id', $this->cycle2->id)
            ->where('stats.pending', 1)
            ->where('stats.completed', 0)
            ->has('assignments', 1)
            ->where('assignments.0.evaluatee.id', $this->colleague2->id)
        );
    }

    public function test_can_switch_active_cycle_via_query_parameter(): void
    {
        // Alice explicitly passes ?cycle_id=cycle1->id
        $response = $this->actingAs($this->staff)->get("/{$this->team->slug}/three-sixty/evaluations?cycle_id={$this->cycle1->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('three-sixty/MyEvaluations')
            ->where('cycle.id', $this->cycle1->id)
            ->where('stats.pending', 0)
            ->where('stats.completed', 1)
            ->has('assignments', 1)
            ->where('assignments.0.evaluatee.id', $this->colleague1->id)
        );
    }

    public function test_submitting_evaluation_preserves_cycle_id_on_redirect(): void
    {
        $eval = ThreeSixtyEvaluation::where('evaluator_id', $this->staff->id)
            ->where('three_sixty_cycle_id', $this->cycle2->id)
            ->first();

        $response = $this->actingAs($this->staff)->post("/{$this->team->slug}/three-sixty/evaluations/{$eval->id}/submit", [
            'ratings' => [
                [
                    'question_id' => $this->question->id,
                    'core_value_id' => $this->coreValue->id,
                    'score' => 5,
                    'comment' => 'Exemplary conduct',
                ],
            ],
            'feedback_summary' => 'Great team player',
        ]);

        $response->assertRedirect("/{$this->team->slug}/three-sixty/evaluations?cycle_id={$this->cycle2->id}");
    }
}
