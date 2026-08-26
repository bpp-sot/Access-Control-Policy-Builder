/**
 * Central branding and version information for the application.
 *
 * Update the version here when releasing a new build. The value is surfaced
 * in the footer, the About page, and is intended to give lab authors a
 * quick visual way to confirm which version of the tool they are running.
 *
 * Versioning convention (semantic versioning):
 *   MAJOR.MINOR.PATCH
 *   - MAJOR: breaking changes
 *   - MINOR: new features (e.g. dependency awareness, new services)
 *   - PATCH: bug fixes and minor tweaks
 */

export const APP_INFO = {
  /** Product name shown in header, footer, hero, and About page. */
  name: 'SoT Policy Studio',
  /** Short monogram rendered inside the header logo badge. */
  monogram: 'SoT',
  /** Tagline shown under the product name. */
  tagline: 'Secure Cloud Access Governance Authoring Platform',
  /** Author / maintainer credited in the footer and About page. */
  author: 'Idris Fabiyi',
  /** Organisation the product is built for. */
  organisation: 'BPP School of Technology',
  /** Application version. Bump this when releasing a new build. */
  version: '1.2.0',
  /** Short human-readable build label, included next to the version. */
  buildLabel: 'AWS Launch Awareness',
} as const;

/** Convenience accessor for the version string, e.g. "v1.2.0". */
export const APP_VERSION = `v${APP_INFO.version}`;

/** Full credit line for footers, e.g. "SoT Policy Studio v1.2.0". */
export const APP_CREDIT = `${APP_INFO.name} ${APP_VERSION}`;
