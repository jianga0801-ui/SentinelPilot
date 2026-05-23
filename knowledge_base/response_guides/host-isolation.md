# Host Isolation Response Guide

## Overview
Host isolation is a high-risk response action. It must remain **simulated** until enterprise response integration is approved by the security team.

## When to Recommend Isolation
- Confirmed malware execution with C2 communication.
- Ransomware or wiper activity detected.
- Lateral movement originating from the host.
- Credential theft tools detected in memory.
- Unauthorized remote access tool (RAT) installed.

## Simulation Behavior
When isolation is recommended in the initial version:
1. An approval request is created with `action_type=isolate_host`.
2. The approval must be manually approved via the API or UI.
3. A simulated execution record is written to the timeline.
4. No actual network or OS changes are made to the host.

## Decision Criteria
| Factor | Recommend Isolation |
|---|---|
| Confirmed C2 beacon | Yes |
| Lateral movement source | Yes |
| Single suspicious process | Consider |
| User-reported phishing with no execution | No |

## References
- Suspicious PowerShell Playbook
