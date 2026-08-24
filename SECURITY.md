# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this application, please report it responsibly. Do not open a public GitHub issue. Instead, contact the maintainers privately with details of the vulnerability.

## Data Handling

This application:

- **Does not** collect, transmit, or store personal data
- **Does not** use analytics, tracking, or telemetry
- **Does not** require authentication or cloud credentials
- **Stores** project data locally in the browser (localStorage)
- **Never** stores secrets, credentials, passwords, access keys, or temporary access passes

## Secret Detection

The application includes a secret detector that warns users if they attempt to enter apparent credentials or secrets into free-text fields. This is a best-effort detection and should not be relied upon as the sole security measure.

## Policy Generation Safety

- Generated policies are based on official Skillable samples where available
- Services without official samples are flagged as requiring manual review (Classification G)
- Broad wildcard permissions are flagged as security risks
- Background deployment scenarios trigger compatibility warnings
- The security review summary identifies potential risks before policy deployment

## Disclaimer

This tool assists with generating Access Control Policies but does not replace manual review. Always review generated policies before deploying them to a production lab environment. The application developers are not responsible for any damages or security incidents resulting from the use of generated policies.
