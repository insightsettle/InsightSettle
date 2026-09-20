# Insight implementation plan

## Outcome
- Convert the current Arabic dark experience into a polished light, English-first product.
- Complete the dashboard, deal-detail, and dispute-analysis experiences.
- Add currency conversion spread to the revenue model and fee presentation.

## Build steps
1. Update global direction, typography, color tokens, shared navigation, footer, labels, and metadata.
2. Translate the existing public pages and demo content while preserving the escrow workflow.
3. Build dashboard metrics, deal lists, required actions, activity, and linked deal details.
4. Build dispute submission with evidence selection and a server-side Lovable AI analysis stream.
5. Add currency spread to service pricing and calculations, then validate all routes and interactions.

## Technical details
- Use the existing TanStack Start routing and component system.
- Keep AI credentials and prompts server-side, using `openai/gpt-6-astra` through the Responses API.
- Uploaded evidence will be represented by filename/type/size in the analysis request; files remain local to the browser in this prototype.
- Preserve the current demo-only payment disclaimer; no real funds are moved.
