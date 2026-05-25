# InsureFlow AI — Roadmap

## In Progress
- Core platform: prospect management, AI qualification, outreach generation
- Pending cases tracker with stale detection
- Automated follow-up queue (hourly scheduler + AI message generation)

## Next Up
- [ ] **Email delivery integration** — wire "Mark Sent" to actually send via SendGrid or Resend
  so queue follow-ups fire as real emails rather than just logging the action.
  Needs: SMTP/API key config, email template wrapper, bounce/open tracking hooks.

## Future
- [ ] Sequence automation — multi-touch drip campaigns triggered by prospect status changes
- [ ] Calendar sync — Cal.com or Calendly API so scheduling flows into real agent calendars
- [ ] Reporting — conversion funnel, rep performance, source attribution by channel
- [ ] IMO/FMO enterprise track — second qualification flow for org-level deals
