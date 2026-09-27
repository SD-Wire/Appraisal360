@component('mail::message')
# Team Invitation

Hello,

**{{ $inviterName }}** has invited you to join the **{{ $teamName }}** team on **Appraise360**, Progressive Credit's performance management platform.

@component('mail::panel')
**Invitation Details:**
- **Branch / Team:** {{ $teamName }}
- **Assigned Role:** {{ $roleLabel }}
- **Invited By:** {{ $inviterName }} ({{ $inviterEmail }})
@endcomponent

Please click the button below to accept your invitation and log into your account:

@component('mail::button', ['url' => $acceptUrl, 'color' => 'primary'])
Accept Invitation & Log In
@endcomponent

If you do not have an account yet, clicking the link above will guide you through completing your profile setup.

If you did not expect this invitation, you can safely ignore this email.

Best regards,<br>
**Progressive Credit Team**
@endcomponent
