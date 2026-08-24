You are implementing a secure, member-only purchasing system for the Wine & Chapters website.

IMPORTANT EXECUTION RULES

- I will explicitly tell you which phase to complete.
- Complete only the requested phase and then stop.
- Do not implement work belonging to later phases.
- Do not begin another phase automatically.
- Inspect only files relevant to the requested phase.
- Reuse the repository’s existing architecture, conventions, components and styling.
- Preserve all existing functionality and dynamic content.
- Do not introduce a second styling, authentication or data-access architecture.
- Do not deploy or push unless explicitly instructed.
- Do not expose or print secrets.
- Avoid unnecessary dependencies.
- Run targeted checks instead of repeatedly running the entire test suite.
- Update SHOP_IMPLEMENTATION.md after each completed phase.
- If SHOP_IMPLEMENTATION.md does not exist, create it during Phase 0.
- If an earlier phase is incomplete, report the exact blocker and stop instead of silently implementing it.
- Keep changes focused and token-efficient.

PROJECT GOAL

Replace the current Shop “Coming Soon” placeholder with an admin-controlled online shop.

Visitors:
- Can browse the shop and view active products.
- Cannot purchase without signing in.

Signed-in members:
- Can add products to their cart.
- Can purchase through Paystack.
- Can view their own orders.
- Can securely download purchased digital products.

Admins:
- Can enable or disable the public shop.
- Can manage physical and digital products.
- Can view and manage orders.
- Receive notifications for successful purchases.
- Use a redesigned admin dashboard with a responsive sidebar.

PRODUCT TYPES

Support:
- Physical products
- Digital products
- Physical + digital bundles

Do not add product variants, discount codes, courier integrations, automated refunds or advanced tax logic in this version.

CORE SECURITY RULES

- Never trust payment success reported by the browser.
- Verify Paystack payments server-side.
- Process Paystack webhooks securely and idempotently.
- Never expose the Paystack secret key in frontend code.
- Store secrets in Supabase Edge Function secrets/environment configuration.
- Never expose permanent public URLs for paid digital files.
- Digital files must be stored privately.
- Generate short-lived signed download URLs only after checking ownership and successful payment.
- Frontend admin checks are not sufficient; enforce permissions through backend validation and Supabase RLS.
- Members may only access their own orders and purchases.
- Public visitors may only read enabled shop settings and active public product information.
- Monetary amounts must be handled consistently. Use integer minor currency units where Paystack requires them and avoid floating-point payment calculations.
- Payment and order operations must be idempotent.
- Do not log payment secrets, webhook signatures or sensitive customer data.

PHASE 0 — REPOSITORY AUDIT AND PLAN

Purpose:
Understand the existing implementation before changing production code.

Tasks:
1. Inspect the repository structure and identify:
   - Frontend framework
   - Routing architecture
   - Styling system
   - Shared UI components
   - Existing public Shop route
   - Existing Coming Soon component
   - Admin dashboard structure
   - Member portal structure
   - Authentication implementation
   - Member and admin role enforcement
   - Supabase client and server patterns
   - Existing migrations and RLS conventions
   - Existing Storage buckets and upload patterns
   - Existing Edge Functions
   - Existing email and notification implementation
   - Existing currency or payment-related utilities

2. Determine the exact files and routes affected by each phase.

3. Design the proposed database entities and relationships based on existing repository conventions.

4. Create SHOP_IMPLEMENTATION.md containing:
   - Current architecture summary
   - Relevant files
   - Proposed data model
   - Storage approach
   - Paystack payment lifecycle
   - Authentication and authorization approach
   - Phased checklist
   - Risks and repository-specific constraints
   - Required environment variables and Supabase secrets
   - Decisions or assumptions that still require confirmation

Restrictions:
- Do not modify production functionality.
- Do not install dependencies.
- Do not create migrations.
- Do not implement the shop.

Done when:
- SHOP_IMPLEMENTATION.md contains an implementation-ready, repository-specific plan.

Stop after Phase 0.

PHASE 1 — ADMIN SIDEBAR AND NAVIGATION

Purpose:
Create enough space in the admin area for the shop and future management features.

Tasks:
1. Refactor the existing admin dashboard to use a responsive sidebar.

Recommended navigation structure:
- Overview
- Content
  - Books
  - Events
  - Reviews
- Community
  - Members
  - Suggestions and Polls
- Shop
  - Products
  - Orders
  - Shop Settings
- Notifications
- Site Settings

2. Adapt this structure to the routes and features that actually exist. Do not create empty pages for features that are not currently implemented unless a route is required for this shop project.

3. Sidebar behaviour:
- Persistent on desktop where appropriate
- Collapsible or drawer-based on mobile
- Clear active route
- Accessible keyboard navigation
- Proper labels and icons using the existing icon system
- No hidden or unreachable admin controls
- Preserve existing authorization guards

4. Preserve the Wine & Chapters theme while making the dashboard clean and uncluttered.

5. Move existing admin sections into the new navigation without changing their business logic.

6. Add routes/placeholders for:
- Shop Products
- Shop Orders
- Shop Settings

The placeholders should clearly state that implementation follows in later phases. Do not implement shop management yet.

7. Ensure existing deep links continue working or provide safe redirects where required.

Verification:
- Test desktop and mobile sidebar behaviour.
- Verify all existing admin areas remain accessible.
- Verify non-admin users cannot access admin routes.
- Run targeted lint/type checks for changed files.

Done when:
- Admin navigation uses a responsive sidebar.
- Existing admin tools still work.
- Shop navigation destinations exist as placeholders.

Update SHOP_IMPLEMENTATION.md and stop after Phase 1.

PHASE 2 — SHOP DATABASE, SETTINGS AND PRODUCT MANAGEMENT

Purpose:
Create the shop foundation and allow admins to prepare products before launch.

First:
- Read SHOP_IMPLEMENTATION.md.
- Verify Phase 1 is complete.
- Follow existing Supabase migration and RLS conventions.

Data model:
Adapt names to the repository’s conventions, but support the following concepts.

Shop settings:
- Shop enabled
- Physical products enabled
- Digital products enabled
- Delivery enabled
- Collection enabled
- Flat delivery fee
- Optional free-delivery threshold
- Collection instructions
- Order notification email
- Currency, initially ZAR
- Updated timestamp
- Updated by

Products:
- UUID
- Title
- Description
- Product type: physical, digital or bundle
- Price
- Public image reference
- Active/inactive status
- Featured status
- Display order
- Physical stock quantity where relevant
- Track stock setting where relevant
- Delivery availability where relevant
- Collection availability where relevant
- Private digital file reference where relevant
- Created and updated timestamps
- Created by

Implementation requirements:
1. Prefer an existing general settings table if it cleanly supports the shop setting. Do not create unnecessary duplicate settings systems.

2. Create Supabase migrations for:
- Required tables/columns
- Constraints
- Indexes
- Updated timestamp handling where consistent with the repo
- RLS policies

3. Create or configure Storage:
- Public or safely readable product-image bucket
- Private digital-product bucket
- Appropriate MIME-type and file-size restrictions
- Admin-only digital file uploads
- No public listing or direct access to paid files

4. Implement Shop Settings:
- Shop enabled switch
- Clear live/hidden status
- Physical/digital product switches
- Delivery/collection configuration
- Delivery fee settings
- Notification email
- Validation and save feedback

5. Implement product management:
- Product list
- Search or basic filtering if justified by existing patterns
- Add product
- Edit product
- Activate/deactivate product
- Delete or archive product
- Featured status
- Display ordering

6. Product form fields:
- Title
- Description
- Product type
- Price in ZAR
- Product image
- Stock fields for physical products
- Delivery/collection fields for physical products
- Private file upload for digital products and bundles
- Active status
- Featured status
- Display order

7. Product form behaviour:
- Dynamically show fields relevant to the selected type.
- Validate required fields.
- Show image preview.
- Show digital filename without exposing its storage URL.
- Validate file types and sizes.
- Safely clean up replaced files when appropriate.
- Confirm destructive deletion.
- Do not store image or file data as base64.

8. Protect all writes:
- Only authorised admins may modify products/settings.
- Enforce this in Supabase/backend logic, not only the UI.

Do not implement:
- Public catalogue
- Cart
- Checkout
- Paystack
- Orders
- Digital downloads for customers

Verification:
- Test shop setting persistence.
- Test all three product types.
- Test image and private digital uploads.
- Test product edit, activation and deletion/archive.
- Verify unauthorised users cannot modify shop data.
- Run targeted checks and migration validation where available.

Done when:
- Admins can configure the shop and fully manage products.
- Public Shop behaviour has not yet been changed.

Update SHOP_IMPLEMENTATION.md and stop after Phase 2.

PHASE 3 — PUBLIC SHOP, PRODUCT VIEW AND CART

Purpose:
Replace the Coming Soon page with the live catalogue when enabled.

Tasks:
1. Public Shop states:

When shop is disabled:
- Preserve the current Coming Soon presentation.

When shop is enabled with products:
- Display active products only.
- Respect product-type feature switches.
- Sort featured/display-order products appropriately.
- Use a polished responsive product grid matching the existing theme.

When enabled but empty:
- Show a friendly “New items are on the way” state.

2. Product cards must show:
- Image
- Title
- Short description
- Formatted ZAR price
- Product type where useful
- Stock/unavailable status where relevant
- View-product action
- Add-to-cart action

3. Create a product detail view if appropriate for the existing router:
- Larger image
- Full description
- Price
- Product type
- Availability
- Delivery/collection information where applicable
- Add-to-cart action

4. Cart:
- Add and remove products
- Change quantity for physical products
- Prevent invalid quantities
- Prevent quantities beyond known stock
- Digital products should generally have a maximum quantity of one
- Calculate subtotal and estimated delivery separately
- Use integer-safe monetary calculations
- Persist the cart safely across navigation
- Do not store sensitive information in local storage

5. Authentication behaviour:
- Visitors may browse products.
- Visitors may build a local cart.
- Checkout requires authentication.
- When a signed-out visitor tries to checkout, show a themed sign-in prompt.
- Preserve the cart through authentication.
- Return the user to checkout after successful sign-in where the existing auth flow supports it.
- Do not require sign-in merely to view the shop.

6. Loading/error/accessibility:
- Add skeleton or appropriate loading states.
- Add friendly error states.
- Ensure controls have accessible labels and focus styles.
- Ensure mobile layout is polished.
- Avoid exposing private product-file metadata.

Do not implement:
- Order creation
- Paystack initiation
- Payment verification
- Admin order management
- Customer downloads

Verification:
- Test disabled, enabled-empty and enabled-populated states.
- Test signed-out and signed-in cart behaviour.
- Test physical, digital and bundle products.
- Test cart calculations.
- Test mobile and desktop layouts.
- Run targeted checks.

Done when:
- The public shop and cart work correctly.
- Checkout presents a clear sign-in requirement but does not yet initiate payment.

Update SHOP_IMPLEMENTATION.md and stop after Phase 3.

PHASE 4 — ORDERS, CHECKOUT AND PAYSTACK

Purpose:
Implement secure checkout and verified Paystack payments.

Before coding:
- Read SHOP_IMPLEMENTATION.md.
- Inspect current Paystack documentation relevant to transaction initialization, verification and webhook signatures.
- Follow the repository’s Supabase Edge Function conventions.
- Never place the Paystack secret in frontend code.

Order data must support:
- Unique human-readable order reference
- Member/user ID
- Customer name
- Customer email
- Customer phone where required
- Currency
- Product subtotal
- Delivery fee
- Total
- Payment status
- Fulfilment status
- Paystack transaction/reference identifiers
- Payment timestamps
- Delivery or collection method
- Delivery address snapshot where applicable
- Collection details where applicable
- Created and updated timestamps

Order items must store immutable purchase snapshots:
- Product ID
- Product title at purchase
- Product type at purchase
- Unit price
- Quantity
- Line total
- Relevant digital/physical indicators

Do not calculate historical order display using mutable current product prices.

Payment states:
- Pending
- Paid
- Failed
- Refunded, reserved for future/manual handling

Fulfilment states:
- Unfulfilled
- Processing
- Ready for collection
- Shipped
- Completed
- Cancelled

Tasks:
1. Add required order and order-item migrations, constraints, indexes and RLS.

2. Implement authenticated checkout:
- Require a signed-in member.
- Pre-fill name and email from the member profile where available.
- Ask for phone number if required.
- For physical items, offer only enabled fulfilment methods.
- Require and validate a delivery address for delivery.
- Do not ask for an address for digital-only orders.
- Display an order summary before payment.

3. Server-side checkout initialization:
- Re-fetch products server-side.
- Revalidate active status, price and availability.
- Recalculate subtotal, delivery fee and total server-side.
- Never trust totals supplied by the browser.
- Create a pending order.
- Initialize Paystack using the server-calculated amount.
- Associate Paystack metadata/reference with the internal order.
- Prevent reference reuse.

4. Payment verification:
- Verify transactions server-side.
- Confirm reference, amount, currency and expected order.
- Mark an order paid only once.
- Do not use the browser redirect alone as payment proof.
- Make repeated verification safe.

5. Paystack webhook:
- Validate Paystack’s webhook signature using the raw request body as required.
- Reject invalid signatures.
- Handle supported successful-payment events.
- Make event processing idempotent.
- Confirm the transaction belongs to the expected order.
- Confirm amount and currency before marking paid.
- Safely tolerate webhook retries and redirect verification arriving in either order.

6. Stock:
- Reduce tracked physical stock only after verified payment.
- Make stock reduction idempotent.
- Prevent stock from being reduced twice.
- Avoid overselling as far as Supabase/PostgreSQL transaction patterns allow.
- Record and clearly handle a stock conflict.
- Do not reduce stock for failed or abandoned payments.
- Do not track stock for digital-only products unless explicitly configured.

7. Checkout result pages:
- Payment processing
- Success
- Failed/cancelled
- Pending verification
- Provide the order reference.
- Never claim success until server verification confirms payment.

8. Environment documentation:
Document exact required secrets, for example:
- Paystack secret key
- Paystack public key if used by the selected integration
- Approved site URL
- Webhook URL
- Email-related secrets already used by the project

Use the repository’s actual naming conventions.

Do not implement:
- Digital download delivery
- Admin order interface
- Email/admin notifications, unless necessary infrastructure already makes this trivial
- Automated refunds

Verification:
- Test server-side price recalculation.
- Test unauthenticated checkout rejection.
- Test physical, digital and mixed carts.
- Test altered client totals being rejected/ignored.
- Test webhook signature validation.
- Test webhook retries.
- Test verification/webhook race conditions.
- Test amount and currency mismatch handling.
- Test stock reduction occurs exactly once.
- Run targeted tests and type checks.

Done when:
- Members can complete a secure Paystack checkout.
- Orders are persisted and only marked paid following server-side verification.
- Stock changes safely after verified payment.

Update SHOP_IMPLEMENTATION.md and stop after Phase 4.

PHASE 5 — ADMIN ORDERS AND NOTIFICATIONS

Purpose:
Allow admins to see and fulfil purchases and receive new-order alerts.

Tasks:
1. Admin Orders page:
- List orders newest first.
- Display order reference, member/customer, date, amount, payment status, fulfilment status and fulfilment method.
- Highlight newly paid or unfulfilled orders.
- Add useful filters for payment status, fulfilment status and order type.
- Add an order detail view.

2. Order details:
- Customer/member information
- Purchased item snapshots
- Totals and delivery fee
- Paystack reference without exposing secrets
- Payment status
- Fulfilment method
- Delivery address or collection information
- Order timeline/status history if supported by the chosen schema
- Digital-item indicator
- Admin notes if appropriate

3. Admin actions:
- Update fulfilment status
- Add optional tracking/reference information
- Mark ready for collection
- Mark shipped
- Mark completed
- Cancel only when allowed by the implemented rules
- Do not falsely mark unpaid orders as paid through a normal UI control
- Confirm destructive or irreversible actions

4. Admin dashboard overview:
- New/unfulfilled order count
- Recent orders
- Revenue based on verified paid orders
- Link to all orders
- Keep metrics lightweight and query-efficient

5. In-app admin notification:
- Create a notification after a newly verified successful payment.
- Make notification creation idempotent.
- Display unread/new-order status using the existing notification system.
- If no suitable system exists, implement the smallest repository-consistent notification table and UI required.

6. Email notification:
- Send a themed Wine & Chapters email to the configured order-notification address.
- Include order reference, customer, items, total and fulfilment method.
- Do not include unnecessary sensitive information.
- Do not send duplicates when Paystack retries a webhook.
- Record or safely handle delivery failure without reversing a successful order.
- Reuse the existing email function/template system.

7. Optional member order confirmation:
- If consistent with the current email system, send the member a payment/order confirmation.
- Do not block order completion if email delivery fails.

Verification:
- Test order filters and details.
- Test fulfilment updates.
- Verify only admins can see all orders.
- Test webhook retry does not duplicate notifications or emails.
- Test dashboard totals include verified paid orders only.
- Run targeted checks.

Done when:
- Admins can see and manage orders.
- A verified purchase creates one dashboard notification and one admin email.

Update SHOP_IMPLEMENTATION.md and stop after Phase 5.

PHASE 6 — MEMBER ORDERS AND SECURE DIGITAL DELIVERY

Purpose:
Let members track orders and access purchased digital products securely.

Tasks:
1. Add a My Orders area to the member portal.

Members can view:
- Their own order reference
- Order date
- Purchased products
- Order total
- Payment status
- Fulfilment status
- Delivery or collection information
- Tracking information where available
- Digital-download actions where eligible

2. Enforce ownership:
- Members may only query their own orders and order items.
- Admins may query all orders.
- Do not rely only on frontend filtering.
- Add and verify RLS policies.

3. Digital delivery eligibility:
A download is available only when:
- The user is authenticated.
- The order belongs to the user.
- The order is verified as paid.
- The requested item belongs to that order.
- The item contains a digital component.
- The underlying product/file is still valid under the implemented business rules.

4. Secure download service:
- Keep digital assets in a private Supabase Storage bucket.
- Use an authenticated Edge Function or equivalent server-side endpoint.
- Verify order ownership and payment before issuing access.
- Generate a short-lived signed URL or securely stream the file.
- Do not return the permanent storage path unnecessarily.
- Prevent arbitrary path selection by the client.
- Apply reasonable rate limiting or abuse protection using existing project patterns where possible.

5. Digital fulfilment:
- Digital-only purchases become available after verified payment.
- Bundle digital content becomes available after verified payment even while physical fulfilment remains pending.
- Mixed orders still display physical tracking separately.

6. Customer email:
- After verified payment, send a themed confirmation.
- For digital items, preferably direct the member to sign in and use My Orders rather than placing a long-lived file URL in the email.
- If an email download link is used, it must be short-lived and ownership-safe.
- Ensure webhook retries cannot send duplicate emails.

7. Optional audit information:
If consistent with the project, record:
- Download requested timestamp
- Order item
- Member
- Basic non-sensitive audit information

Do not build complex DRM.

Verification:
- Test access to owned paid downloads.
- Reject unpaid, failed, other-member and arbitrary-file requests.
- Test expired signed URLs.
- Test digital-only, physical-only and bundle orders.
- Verify members cannot enumerate other orders.
- Run targeted checks.

Done when:
- Members can track their own purchases.
- Paid digital products can be downloaded securely.
- Private product files are never publicly exposed.

Update SHOP_IMPLEMENTATION.md and stop after Phase 6.

PHASE 7 — FINAL INTEGRATION REVIEW AND UI POLISH

Purpose:
Review the complete feature, fix integration problems and ensure it is production-ready.

Do not redesign unrelated areas or add new features.

Tasks:
1. Review the full workflow:
- Admin sidebar
- Shop settings
- Product management
- Coming Soon state
- Public catalogue
- Cart
- Sign-in gate
- Checkout
- Paystack processing
- Order creation
- Webhook verification
- Stock changes
- Admin notification
- Admin order management
- Member My Orders
- Digital downloads

2. UI cleanup:
- Match the Wine & Chapters visual identity.
- Standardise cards, radiuses, shadows, spacing and form controls in newly added areas.
- Ensure sidebar and shop work on mobile.
- Add consistent loading, empty, success and error states.
- Ensure keyboard focus and accessible labels.
- Respect prefers-reduced-motion.
- Avoid turning the site into a generic SaaS dashboard.

3. Security review:
- Search for accidentally exposed Paystack secrets.
- Check RLS coverage.
- Check admin authorization.
- Check member order ownership.
- Check payment amount validation.
- Check webhook signature validation.
- Check idempotency.
- Check stock reduction.
- Check private digital storage.
- Check signed-download authorization.
- Check sensitive logging.

4. Data integrity review:
- Verify order-item snapshots.
- Verify integer-safe monetary handling.
- Verify payment and fulfilment statuses remain separate.
- Verify repeated webhook delivery is harmless.
- Verify product deletion does not break historical orders.
- Verify inactive products remain visible in historical orders but cannot be newly purchased.

5. Testing:
- Run targeted tests first.
- Run lint.
- Run type-check.
- Run production build.
- Run the broader relevant test suite once, after targeted issues are fixed.
- Fix regressions caused by the shop implementation.
- Do not repair unrelated legacy failures unless they block verification; document them separately.

6. Documentation:
Update SHOP_IMPLEMENTATION.md with:
- Final architecture
- Completed checklist
- Database migrations
- Storage buckets and policies
- Edge Functions
- Paystack webhook configuration
- Required environment variables/secrets
- Local testing steps
- Supabase deployment commands
- Production rollout order
- Known limitations

7. Provide a concise completion report:
- Files changed
- Migrations added
- Storage configuration
- Edge Functions added/updated
- Routes added/updated
- Security controls
- Tests and build results
- Existing unrelated failures
- Manual deployment/configuration steps Martin must perform

Done when:
- The complete shop flow is integrated and verified.
- No known critical payment, authorization or digital-file security issue remains.

Stop after Phase 7.

RELEASE ORDER

The safe deployment order should be documented and generally follow:

1. Apply database migrations and RLS.
2. Create/configure Storage buckets and policies.
3. Configure Supabase secrets.
4. Deploy Edge Functions.
5. Configure the Paystack webhook URL.
6. Deploy the frontend.
7. Keep the shop disabled.
8. Create and test products.
9. Run a Paystack test transaction.
10. Verify admin/member notifications and digital access.
11. Enable the shop only after successful testing.

FINAL SCOPE REMINDER

Implement only the phase I explicitly request.

Do not continue into the next phase.
Do not broaden the project.
Do not push or deploy unless explicitly instructed.
Update SHOP_IMPLEMENTATION.md, report what was completed and then stop.
