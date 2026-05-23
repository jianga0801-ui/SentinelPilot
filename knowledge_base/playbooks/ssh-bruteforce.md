# SSH Brute Force Playbook

## Detection
- Monitor `/var/log/auth.log` or `security` event log for repeated `Failed password` entries.
- Correlate source IP, target usernames, and timing patterns.

## Triage
1. Count failed attempts within the detection window.
2. Identify whether a successful login followed the failures.
3. Check the source IP against threat intelligence.
4. Verify if the account is a known service account or human user.

## Investigation
- Run `search_logs` with the source IP and `log_type=auth` to retrieve all authentication events.
- Run `lookup_threat_intel` on the source IP.
- Review the time range for any lateral movement after the successful login.
- Check if the account has MFA enabled.

## Response Actions
- **High confidence + successful login**: Recommend IP block approval.
- **No successful login**: Increase monitoring on the targeted account.
- **Known admin mistake (e.g., forgotten password)**: Close as false positive.

## Escalation
- If the account is privileged (domain admin, root, service account), escalate to tier 2.
- If lateral movement is detected after the successful login, escalate to incident response.

## References
- MITRE ATT&CK T1110: Brute Force
