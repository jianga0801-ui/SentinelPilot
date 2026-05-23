# Suspicious PowerShell Playbook

## Detection
- Monitor Windows Event ID 4104 (ScriptBlock Logging) and 4688 (Process Creation).
- Look for `-EncodedCommand`, `-ExecutionPolicy Bypass`, and `IEX` (Invoke-Expression).
- Alert on PowerShell spawned by non-admin tools (Outlook, Office, browser).

## Triage
1. Extract and decode the full command line.
2. Identify the parent process and user context.
3. Check for network destinations in the decoded script.
4. Verify file artifacts dropped to disk.

## Investigation
- Run `search_logs` with `log_type=process` and the hostname.
- Run `lookup_threat_intel` on any IPs or domains in the command.
- Review registry modifications and scheduled task creation.
- Check for persistence mechanisms (Run keys, schtasks, startup folder).

## Response Actions
- **Encoded command + network download**: Recommend host isolation approval.
- **Suspicious but no network activity**: Collect artifacts and monitor.
- **Parent is Office or browser**: Treat as high priority (phishing vector).

## Escalation
- If lateral movement is detected from the host, escalate to incident response.
- If credentials are found in the script content (e.g., `Invoke-Mimikatz`), escalate immediately.

## References
- MITRE ATT&CK T1059.001: Command and Scripting Interpreter: PowerShell
