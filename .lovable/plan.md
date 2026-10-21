# AI News & Research Centre

## Scope
- Add an admin-only light-theme workspace without changing the public website or existing content tools.
- Provide AI Daily Intelligence using actual news runs, drafts and published article records, with IST date filters, publication trends, research/error reporting, previews, canonical URL copying and CSV export.
- Integrate the existing News Engine, Content Studio, Real Estate and Sitemap controls as dedicated tabs.

## Safety and limitations
- Restrict the new workspace to the admin role verified by the backend.
- Clearly label legacy AI-suggested sources as unverified; never present them as completed fact checks.
- Do not enable unattended publishing: the existing engines lack verified evidence gates. Scheduler, independent research verification and Search Console integration remain a separate implementation phase.

## Technical details
- Reuse existing tables, publishing functions and design components.
- Add a report utility with tests for IST date ranges and record-derived totals; verify the authenticated admin flow and mobile layout.
