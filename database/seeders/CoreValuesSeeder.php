<?php

namespace Database\Seeders;

use App\Models\CoreValue;
use App\Models\CoreValueQuestion;
use Illuminate\Database\Seeder;

class CoreValuesSeeder extends Seeder
{
    public function run(): void
    {
        $values = [
            [
                'name' => 'Integrity',
                'description' => 'Adherence to moral and ethical principles, honesty, transparency, and accountability in all actions and decisions.',
                'weight' => 20,
                'order' => 1,
                'is_active' => true,
                'questions' => [
                    [
                        'question' => 'Demonstrates honesty, ethical behavior, and moral courage in all professional dealings.',
                        'description' => 'Is truthful with customers, colleagues, and management even in difficult situations; protects confidential company and client data.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 1,
                    ],
                    [
                        'question' => 'Takes ownership and accountability for actions, decisions, and mistakes without shifting blame.',
                        'description' => 'Honors commitments and timelines; proactively acknowledges errors and implements corrective measures promptly.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 2,
                    ],
                ],
            ],
            [
                'name' => 'Passion',
                'description' => 'Unwavering energy, enthusiasm, commitment, and dedication towards achieving institutional and personal excellence.',
                'weight' => 20,
                'order' => 2,
                'is_active' => true,
                'questions' => [
                    [
                        'question' => 'Demonstrates high energy, positive attitude, and enthusiasm for the organization’s vision and daily work.',
                        'description' => 'Approaches responsibilities proactively with determination, motivating team members and fostering high morale.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 1,
                    ],
                    [
                        'question' => 'Consistently goes beyond baseline requirements to deliver superior results and continuous self-development.',
                        'description' => 'Displays strong drive for personal mastery, seeking constructive feedback and taking initiative to support team priorities.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 2,
                    ],
                ],
            ],
            [
                'name' => 'Customer Delight',
                'description' => 'Putting internal and external customers first, delivering responsive, empathetic, and exceptional experiences.',
                'weight' => 20,
                'order' => 3,
                'is_active' => true,
                'questions' => [
                    [
                        'question' => 'Listens actively, understands customer needs deeply, and responds with promptness and empathy.',
                        'description' => 'Delivers timely customer solutions with patience, respect, and high standard of service for both internal & external stakeholders.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 1,
                    ],
                    [
                        'question' => 'Anticipates challenges and exceeds customer expectations to foster trust and long-term relationships.',
                        'description' => 'Turns complaints into opportunities, communicates transparently, and ensures follow-through until full customer satisfaction.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 2,
                    ],
                ],
            ],
            [
                'name' => 'Innovation',
                'description' => 'Embracing creativity, continuous learning, and forward-thinking problem solving to enhance processes and efficiency.',
                'weight' => 20,
                'order' => 4,
                'is_active' => true,
                'questions' => [
                    [
                        'question' => 'Identifies inefficiencies and proposes creative, practical solutions to improve workflows and services.',
                        'description' => 'Challenges status quo constructively, contributing ideas that eliminate bottlenecks and enhance operational productivity.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 1,
                    ],
                    [
                        'question' => 'Demonstrates agility and adaptability when navigating change, new technologies, or evolving business needs.',
                        'description' => 'Adopts new systems, policies, and tools readily while guiding or supporting peers through organizational transitions.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 2,
                    ],
                ],
            ],
            [
                'name' => 'Professionalism',
                'description' => 'Exhibiting competence, reliability, mutual respect, adherence to company standards, and collaborative team spirit.',
                'weight' => 20,
                'order' => 5,
                'is_active' => true,
                'questions' => [
                    [
                        'question' => 'Maintains high standards of workplace etiquette, punctuality, and respectful collaboration with all colleagues.',
                        'description' => 'Communicates clearly and respectfully across levels, fosters inclusion, and represents the brand reputably at all times.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 1,
                    ],
                    [
                        'question' => 'Complies consistently with organizational policies, regulatory frameworks, and operational quality benchmarks.',
                        'description' => 'Executes tasks with discipline, diligence, attention to detail, and thorough adherence to internal governance.',
                        'weight' => 50,
                        'min_score' => 1,
                        'max_score' => 5,
                        'order' => 2,
                    ],
                ],
            ],
        ];

        foreach ($values as $valData) {
            $questions = $valData['questions'];
            unset($valData['questions']);

            $coreValue = CoreValue::updateOrCreate(
                ['name' => $valData['name']],
                $valData
            );

            foreach ($questions as $qData) {
                CoreValueQuestion::updateOrCreate(
                    [
                        'core_value_id' => $coreValue->id,
                        'question' => $qData['question'],
                    ],
                    $qData
                );
            }
        }
    }
}
