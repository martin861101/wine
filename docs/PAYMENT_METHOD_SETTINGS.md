# Payment method settings

`payment_method_settings` is a singleton Supabase table introduced by migration
`20260824223000_payment_method_settings.sql`.

- `online_payments_enabled` selects secure online checkout or manual payment.
- `manual_payment_message` is administrator-authored, preserves line breaks in the member UI, and may contain banking instructions.
- Anonymous and authenticated users can read the setting so the public Events page can render the correct option. Only approved administrators may insert or update it through RLS.

The `paystack-checkout` Edge Function reads the setting with its service role before starting a contribution or membership checkout. It returns a safe 503 response and does not create an order if online payments are disabled or the setting cannot be read. The `verify` action and `paystack-webhook` function deliberately bypass this guard so outstanding payments and existing webhook processing remain intact.

Do not add provider secrets, API keys, passwords, or other credentials to the manual-payment message. Those remain Edge Function secrets only.
