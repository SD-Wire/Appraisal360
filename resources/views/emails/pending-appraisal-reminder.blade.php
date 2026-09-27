@component('mail::message')
# Appraisal Action Required: Pending Appraisals Reminder

Hello **{{ $userName }}**,

This is an automated notification from **Appraise360** (Progressive Credit Performance Management). You have outstanding appraisals that require your completion.

@if(!empty($managerNote))
> **Note from Management / HR:**  
> *"{{ $managerNote }}"*
@endif

@component('mail::panel')
### Appraisal Status Summary
- **Appraisals Completed:** <strong style="color: #15803D;">{{ $totalCompleted }}</strong>
- **Appraisals Remaining:** <strong style="color: #EA580C;">{{ $totalRemaining }}</strong>
@if($earliestDeadline)
- **Submission Deadline:** **{{ $earliestDeadline }}** 
@if($daysLeft !== null && $daysLeft >= 0)
  <span style="color: #EA580C; font-weight: bold;">({{ $daysLeft === 0 ? 'Today is the deadline!' : ($daysLeft === 1 ? '1 day remaining' : $daysLeft . ' days remaining') }})</span>
@elseif($daysLeft !== null && $daysLeft < 0)
  <span style="color: #DC2626; font-weight: bold;">(Overdue by {{ abs($daysLeft) }} days)</span>
@endif
@endif
@endcomponent

---

@if(!empty($appraiseesRemaining))
### Appraisees / Objectives Awaiting Your Completion:
@foreach($appraiseesRemaining as $appraisee)
- • **{{ $appraisee }}**
@endforeach
@endif

@component('mail::button', ['url' => $actionUrl, 'color' => 'primary'])
Complete Your Appraisals Now
@endcomponent

> **Note on Automated Reminders:**  
> This reminder is sent daily to notify you of outstanding evaluations. Automated notifications will stop once your appraisals are completed or when the official submission deadline of **{{ $earliestDeadline ?? 'the cycle' }}** is reached.

If you have any questions or require assistance, please contact your Regional HRBP or the HR Department.

Best regards,  
**Performance Management Team**  
*Progressive Credit — "Taking every step with you"*
@endcomponent
