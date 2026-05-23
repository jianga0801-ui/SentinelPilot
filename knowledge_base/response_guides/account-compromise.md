# Account Compromise Response Guide

## Immediate Actions
1. Verify the account ownership and recent activity with the user or team lead.
2. Check if the account has MFA enabled and whether MFA was triggered.
3. Review recent logins for unusual geographic locations or IP addresses.

## Remediation
1. Force password reset for the compromised account.
2. Revoke all active sessions and tokens.
3. Review and remove any unauthorized MFA devices.
4. Check for mailbox rules or forwarding rules that may have been added.

## Investigation
- Review authentication logs for the 72 hours before the first suspicious event.
- Check for password spray patterns targeting the same user.
- Determine if the same credentials were used on other services.

## Hardening
- Enforce MFA for all accounts.
- Enable login alerts for unfamiliar locations.
- Implement risk-based conditional access policies.
