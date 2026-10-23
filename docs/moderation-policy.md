# Content moderation policy

Startlete prohibits sexually explicit content, nude or sexualized images, links
to adult sites or paid adult-content pages, and anything involving a minor in a
sexual or suggestive way. Violations lead to content removal and account
suspension.

## Image handling

- Every image accepted by the local upload or receipt-moderation API is checked
  on the server before it can be shown. The default provider is the open-source
  NSFWJS model; it is a screening aid, not a guarantee.
- Clearly explicit images are rejected and their bytes are not retained.
- Borderline images, provider failures, and timeouts are held for review and
  remain hidden from the public. A moderator must approve them before public
  display.
- Automated decisions record the demo user id, result, short reason, and time.
  Image bytes are not included in decision logs.
- Admins can approve or reject held images, remove active images, and process
  reports with the outcomes dismissed, warning, content removed, or account
  suspended. Repeated rejections are flagged in the admin view.
- Users may report a post or image through its report control. Reports are
  delivered to the local admin queue.

## Development-only limitations

Post metadata remains in browser localStorage. Upload files, review metadata,
reports, and decision logs are stored in the ignored `uploads/` directory for
local development only; image APIs are disabled in production. The demo role
picker and local admin token are not real account authentication, and
in-memory rate limiting is not durable. This implementation is not suitable
for deployment until real authentication, durable storage, and shared rate
limiting are configured.
