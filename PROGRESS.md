# PROGRESS

One line per merged PR, per the master document. T0 is the scaffold commit straight to main.

- T0 scaffold: committed to local main (push blocked, see BLOCKERS.md). Checks all pass locally: typecheck, jest, test:inject, test:screens, expo-doctor 21/21 checks, web export to dist/.
- PR #1 (T1 tracer): 52 URL cases through decide() plus injected/native parity (105 jest tests), web export and the 390x844 screenshot test pass locally. Nothing blocked. BLOCKERS entry 1 resolved in the same PR.
- PR #2 (T3 LinkedIn): 63 row LinkedIn decide() table plus parity for both sites (235 jest tests), 6 inject fixture tests over 3 LinkedIn fixtures, 8 screen tests with captures. Lint, typecheck, web export pass. Nothing blocked.

- PR #3 (T2 Instagram): 11 row Instagram decide() table plus native and injected parity for both sites (275 jest tests), 15 inject fixture tests over 4 Instagram fixtures, 16 screen tests with captures at 390x844 and QA size, reviewed against the UI rules. Rebased onto the T3 shared inject runtime before merge; typecheck, expo-doctor 21/21 and the web export pass. Nothing blocked.

- PR #4 (T4 QR): 20 case classifyCode() with duplicate scan guard tests on fake timers (302 jest tests total), 6 inject fixture tests, 24 screen tests with captures at 390x844 and QA size, all reviewed against the UI rules. Rebased onto the merged T2 shell (conflicts resolved keeping both sides); typecheck, lint and the web export pass. Nothing blocked. Device only camera steps are in DENIS_TODO.md item 4.

- PR #7 (T5 switcher, settings and state): settings store tests (defaults, storage throw, corrupt JSON, version upgrade and reset) plus store, settings aware decide() and render tests (357 jest tests across 10 suites), 15 inject fixture tests, 29 screen tests with new switcher and settings captures at 390x844 and QA size, reviewed against the UI rules. Settings flow into both hosts so decide() and the injected scripts honor them; lastApp is remembered and both hosts stay mounted on switch. Fast forwarded onto the merged T4 shell (no conflicts). Typecheck, expo-doctor 21/21 and the web export pass. QA evidence recorded against head 7a85c10. Nothing blocked. Device verification of the logout behavior is in DENIS_TODO.md item 4.
