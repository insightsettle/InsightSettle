# Arabic and English platform plan

## Outcome
- Add complete Arabic and English presentation across public, customer, authentication, and staff pages.
- Place one clear language switch in every shared page shell and on standalone error states.
- Remember the selected language and switch the full page between RTL and LTR without changing any deal data.

## Build steps
1. Add a shared language provider with English/Arabic dictionaries, locale-aware labels, and persistent selection.
2. Apply the chosen language and text direction at the document level, including Arabic typography and RTL-safe layout behavior.
3. Add the language switch to the public/customer header and the staff console shell so it remains available throughout the platform.
4. Translate all visible navigation, actions, forms, statuses, validation messages, empty states, legal/help content, and dashboard/console labels.
5. Localize dates, numbers, currencies, and dynamic deal/payment/dispute wording while preserving identifiers, emails, and financial values.
6. Verify public, customer, and staff journeys in both languages on desktop and mobile, including refresh persistence and no layout overlap.

## Technical details
- Keep English as the initial fallback and save the user's choice locally.
- Use React context and typed translation keys rather than duplicating routes or relying on browser translation.
- Update `lang` and `dir` on the root document after hydration, with an early safe fallback to prevent mismatched rendering.
- Keep route URLs, database values, and server-side business logic unchanged; only displayed text is localized.
