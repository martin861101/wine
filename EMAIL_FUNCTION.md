Diagnose and fix the Wine & Chapters email submission flow.

Current issue:

- The website reports that the submission was successful.
- No email is received.
- Supabase Edge Function "send-email" shows absolutely no invocation or log data, even after new submissions.
- Supabase project ref: "ykyzelgoeblxhcdguyww".

Tasks:

1. Trace every form that claims to send email, especially contact, membership, newsletter, review and event forms.
2. Find where the success message is triggered.
3. Confirm whether the frontend invokes "supabase.functions.invoke("send-email")", another Edge Function, or only writes to the database.
4. Fix the wiring so the correct Edge Function is invoked with the required payload.
5. Only display success after both the required database operation and email request succeed.
6. Display a useful error if email delivery fails; do not silently catch errors or show false success.
7. Inspect the "send-email" function payload validation, CORS, authentication requirements, recipient mapping and provider/SMTP response handling.
8. Ensure every failure is logged clearly, while never logging secrets or complete sensitive form contents.
9. Ensure non-2xx email-provider responses cause the Edge Function to return a non-2xx response.
10. Check that the live frontend uses the correct Supabase project URL.
11. Add or update focused tests where practical.
12. Run the relevant lint, type-check, tests and production build.

Do not expose or hard-code credentials. Preserve existing form styling and unrelated behaviour. Implement the fix, then report:

- root cause;
- files changed;
- tests performed;
- required Supabase secrets, listed by name only;
- exact command needed to deploy the changed Edge Function.
