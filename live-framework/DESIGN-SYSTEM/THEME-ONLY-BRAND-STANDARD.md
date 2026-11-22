# S I M P L I C I T Y  G L O B A L — Brand and Theme-Only Standard

**Status:** Applied as a repository design standard  
**Scope:** All company applications, websites, platforms, software products, interfaces, documentation, and design assets.

## 1. Naming and brand rule

Use the approved S I M P L I C I T Y  G L O B A L brand identity for company-owned products and interfaces. Do not use third-party device or product names as company product names, application names, feature names, headings, navigation labels, logos, or marketing identity.

When removing third-party brand references, replace them only with the relevant S I M P L I C I T Y  G L O B A L product or neutral functional wording. Do not invent a product name or imply an affiliation, compatibility, endorsement, or integration that has not been verified.

## 2. Theme-only retention

Where a supplied third-party product reference was provided solely as visual inspiration, retain only explicitly supplied and independently usable visual design material:
- colour palettes and colour relationships;
- gradients;
- background graphics and textures;
- decorative shapes, motifs, and non-branded graphic treatments;
- typography choices and visual hierarchy;
- layout inspiration and spacing treatments.

Do not copy third-party logos, wordmarks, product silhouettes, proprietary interface assets, product screenshots, or other identifying trade dress. Do not infer unspecified colours, fonts, gradients, or graphics from a written hardware specification.

## 3. Excluded technical material

Do not carry product specifications into the S I M P L I C I T Y  G L O B A L design system. Exclude device dimensions, display and camera specifications, processors, sensors, operating-system features, device capabilities, hardware dependencies, and vendor-specific services or integrations unless a separate, independently verified business requirement expressly calls for a neutral interoperability requirement.

## 4. Implementation requirements

1. Search source code, user interfaces, assets, documentation, metadata, package descriptions, and marketing content for third-party brand and product references.
2. Classify each occurrence as a legal attribution, factual compatibility statement, dependency/integration, user-provided content, or company-facing branding.
3. Remove or neutralize company-facing branding references; preserve legally required attribution and accurate factual compatibility disclosures where applicable.
4. Replace brand-specific feature labels with neutral functional labels only when the underlying function exists and has been verified.
5. Preserve unrelated user data, application behaviour, existing assets, and configuration.
6. Do not delete dependencies, integrations, customer content, or operational settings merely because a vendor name appears. Record these for technical review.
7. Run repository-wide text and asset scans, tests, accessibility checks, and visual regression checks before release.
8. Record every changed path and evidence. Do not claim a live website, application, or deployment has been changed unless that deployment has separately been updated and verified.

## 5. Asset availability note

The supplied product-specification text contained no standalone theme graphics, verified colour values, gradient definitions, or typography assets. No replacement visual assets are fabricated by this standard. Add only approved, source-backed design assets.

## 6. Change boundary

This standard authorizes repository-level design and documentation changes within the designated project branch. It does not authorize production deployment, vendor account changes, removal of operational integrations, purchases, or changes to customer data.
