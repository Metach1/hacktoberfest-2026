# Post image moderation design

## Moderation provider comparison

| Option | Cost | Accuracy | Setup difficulty | Privacy |
| --- | --- | --- | --- | --- |
| NSFWJS running on the local server | Free and open source; no paid key | Useful for obvious nudity, but heuristic and can miss context or produce false positives | Moderate: install the model/runtime and allow its model files to be fetched; no hosted account | Uploaded images stay on this app's server. The model may be downloaded separately. |
| Hosted moderation API, configured with `IMAGE_MODERATION_API_URL` and optionally `IMAGE_MODERATION_API_KEY` | Provider-dependent; may be free at low volume, but can incur charges | Provider-dependent and often stronger operationally; still not definitive | Low to moderate once a compatible endpoint and credentials exist | Sends image bytes to the configured provider; its retention and processing policies apply. |

**Recommendation:** Use NSFWJS as the default provider. It is free to run without paid keys, keeps image bytes on the local server, and lets contributors test moderation locally. Treat it as a conservative screening aid, not a guarantee. An optional hosted provider can be selected by setting `IMAGE_MODERATION_API_URL`; its JSON response must be `{ "result": "approved" | "needs_review" | "rejected", "reason": "..." }`. Do not configure a hosted service by default.

## Behavior and limits

- `moderateImage(file)` is the single server-side entry point. It returns a result and short reason. Provider errors, timeouts, and malformed responses become `needs_review`.
- Thresholds live in `src/app/lib/moderation-config.mjs`. NSFWJS only approves low-risk results; explicit or sexualized scores above the strict thresholds are rejected or held for review.
- Validate the actual image signature and decoded image, accept JPEG, PNG, and WebP only, and cap each image at 5 MiB. Re-encode with Sharp to strip EXIF and other metadata before writing a random filename.
- Allow up to 4 images per post. Limit each demo account to 5 upload attempts per 15 minutes. Rejected bytes are discarded; review-required files remain private until approved.
- Store files and moderation metadata under the ignored `uploads/` directory for local development only. A JSON metadata file is not a database and is not suitable for production or multiple server instances.
- The existing login is a browser role picker, not real authentication. The local API uses a signed, HttpOnly demo cookie to enforce the demo role checks, but anyone can request a demo athlete/supporter session; it cannot establish real identity or provide production-grade ownership, account rate limits, or administrator authorization. A configured `DEMO_ADMIN_TOKEN` is required for local review actions. Replace this demo adapter with real authentication and durable storage before deployment.
- Rejected attempts are counted and surfaced in the local admin review view. Decision logs record the demo user, result, reason, and time, never image bytes.
