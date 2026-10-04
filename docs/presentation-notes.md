# Illustrated presentation

## Design reference and attribution

The dark landing, illustrated event-space background, alternating feature rows and large footer wordmark are inspired by the screenshots of Vaibhav Pathak (`vkpdeveloper`)'s [PR #2](https://github.com/diyaavirmani/backstage/pull/2). The PR was inspected read-only. It was not pulled, checked out, cherry-picked or merged; no contributor code, fonts, screenshots or artwork were imported into the application or Git. The implementation remains on `feat/green-saas-redesign` and uses the existing application components. Attribution of design assistance remains in the unpublished submission; avoiding a merge does not remove the challenge's disclosure requirements.

This is an independent implementation of a similar visual direction, not a claim of pixel-identical reproduction or sole authorship of the reference design.

## Original artwork

`public/images/gathering-mural.jpg` is a newly generated imaginary event scene, made with the built-in imagegen tool and optimized to a 270 KiB JPEG. It depicts no identified real venue. The landing and footer label the illustration; its use is decorative, not venue evidence. The private generated original is outside Git. No provider API credentials were used or printed for image generation.

Generation prompt: “Create a brand-new wide landscape editorial oil painting for Backstage, a venue research and event coordination website. Imaginary contemporary Indian community event space, not any identifiable real venue: tall steel-framed windows, indoor plants, warm amber lamps, long tables with a small informal group of young adult founders working and discussing around laptops, a quiet workshop area deeper in the hall. Painterly brush texture, refined architectural composition, forest green and near-black shadows, muted sage, olive, small honey-gold light accents. Composition opens into a bright textured event interior on the right half; left half is darker quiet architectural shadows suitable for overlaid web copy. Canvas wide landscape about 2:1. No written words, logos, typography, brand marks, wedding decorations, exaggerated crowds, fake app UI, or recognizable company facilities. This is explicitly fictional artwork, not venue photography. Original composition with credible human proportions.”

## Working boundaries

- The actual organizer form, discovery cards, evidence panels, private-draft handoff and operations component are retained.
- Page covers, icons, hero/footer, typography and CSS change presentation only.
- Sources, qualifications, historical evidence and unknowns remain visible. Research leads remain draft-only; operational hosts and role switching remain fictional simulations.
- The static preview is explicitly an example derived from checked-in research. It does not create an application or claim live retrieval.
- No dependencies, API contracts, database migrations, resources, credentials, quotas or Railway settings changed. No new live agent calls were made for cosmetic verification.

Run `npm run test:e2e` for production-build browser checks (isolated temporary SQLite). Existing suites cover handoff, persistence, transitions and resource conflicts; `illustrated-presentation.spec.ts` adds artwork delivery, no homepage API side effects, mobile navigation labels, and readable input weights. Screenshots stay ignored in `.playwright-artifacts/green-saas/`.
