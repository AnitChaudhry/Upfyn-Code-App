# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Upfyn Code, **please do not open a public issue.**

Instead, report it responsibly via one of the following:

1. **Email**: Send details to **security@upfyn.com**
2. **GitHub Security Advisories**: Use the [private vulnerability reporting](https://github.com/AnitChaudhry/Upfyn-Code-App/security/advisories/new) feature

### What to include in your report

- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact assessment
- Suggested fix (if you have one)

### What to expect

- **Acknowledgement** within 48 hours of your report
- **Status update** within 7 days with our assessment
- **Resolution timeline** communicated after triage
- **Credit** in the release notes (unless you prefer to remain anonymous)

## Security Best Practices for Contributors

When contributing to Upfyn Code, please follow these security guidelines:

1. **Never commit secrets** — API keys, tokens, passwords, or credentials must never appear in code
2. **Validate all inputs** — Sanitize user input at system boundaries
3. **Use parameterized queries** — Prevent injection attacks in any database operations
4. **Keep dependencies updated** — Check for known vulnerabilities before adding new packages
5. **Principle of least privilege** — Request only the minimum permissions needed

## Scope

This security policy covers the Upfyn Code application source code and its direct dependencies. Third-party services, APIs, and infrastructure are outside the scope of this policy.

---

*We appreciate the security research community and responsible disclosure.*
