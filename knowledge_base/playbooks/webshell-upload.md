# Webshell Upload Playbook

## Detection
- Monitor file upload endpoints for executable extensions (.aspx, .php, .jsp, .war).
- Inspect upload content for code execution patterns.
- Correlate with WAF alerts for SQL injection or path traversal attempts.

## Triage
1. Identify the uploaded file name, path, and extension.
2. Calculate the file hash for threat intelligence lookup.
3. Review the source IP and user agent.
4. Determine if the uploaded file was subsequently accessed.

## Investigation
- Run `search_logs` with `log_type=network` and the source IP.
- Run `lookup_threat_intel` on the file hash and source IP.
- Review web server access logs for POST requests and subsequent GET requests to the uploaded file.
- Check for process execution from the web directory.

## Response Actions
- **Confirmed webshell access**: Recommend evidence preservation and host isolation.
- **File detected but not executed**: Remove the file and close the upload vector.
- **False positive (e.g., image upload with double extension blocked)**: Close investigation.

## Evidence Preservation
- Preserve the uploaded file with its original metadata.
- Export web access logs for the affected time range.
- Take a memory snapshot of the web server process if available.

## References
- MITRE ATT&CK T1505.003: Server Software Component: Web Shell
