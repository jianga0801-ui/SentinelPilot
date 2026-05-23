# IP Blocking Response Guide

## Overview
IP blocking is a high-risk response action and requires **human approval** before any simulated or real enforcement action.

## When to Recommend Blocking
- Source IP engaged in active brute force with successful logins.
- Source IP served malicious payloads (drive-by download, webshell delivery).
- Source IP is known C2 infrastructure confirmed by threat intelligence.
- Source IP appears in active threat intelligence feeds with `malicious` reputation.

## Simulation Behavior
When IP blocking is recommended in the initial version:
1. An approval request is created with `action_type=block_ip`.
2. The approval must be manually approved via the API or UI.
3. A simulated execution record is written to the timeline.
4. No real firewall or WAF rule is created.

## Decision Criteria
| Factor | Recommend Block |
|---|---|
| Brute force + successful login | Yes |
| C2 beacon destination | Yes |
| Scanner/probe only | No |
| Single failed login attempt | No |
| Known false positive source | No |

## References
- SSH Brute Force Playbook
