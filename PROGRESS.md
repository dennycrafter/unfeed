# PROGRESS

One line per merged PR, per the master document. T0 is the scaffold commit straight to main.

- T0 scaffold: committed to local main (push blocked, see BLOCKERS.md). Checks all pass locally: typecheck, jest, test:inject, test:screens, expo-doctor 21/21 checks, web export to dist/.
- PR #1 (T1 tracer): 52 URL cases through decide() plus injected/native parity (105 jest tests), web export and the 390x844 screenshot test pass locally. Nothing blocked. BLOCKERS entry 1 resolved in the same PR.
- PR #2 (T3 LinkedIn): 63 row LinkedIn decide() table plus parity for both sites (235 jest tests), 6 inject fixture tests over 3 LinkedIn fixtures, 8 screen tests with captures. Lint, typecheck, web export pass. Nothing blocked.

