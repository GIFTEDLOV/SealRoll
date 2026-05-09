Phase 2D: build the claim fulfillment flow. After requestClaim succeeds, the encrypted salary becomes publicly decryptable via Zama's KMS relayer. The frontend fetches the decryption proof using usePublicDecrypt, then submits fulfillClaim on-chain. fulfillClaim verifies the proof, transfers ETH to the employee, zeroes the salary, and removes them from the employee list.

CONTEXT REMINDERS:
- Contract is deployed at the address in packages/nextjs/contracts/ConfidentialPayroll.ts.
- usePublicDecrypt is from @zama-fhe/react-sdk: () => UseMutationResult<PublicDecryptResult, Error, `0x${string}`[], unknown>
- PublicDecryptResult shape: { clearValues: Record<Handle, ClearValueType>, abiEncodedClearValues: Hex, decryptionProof: Hex }
- fulfillClaim signature on the contract: fulfillClaim(uint256 requestId, bytes32[] handlesList, bytes abiEncodedCleartexts, bytes decryptionProof). Note: the contract param is named "abiEncodedCleartexts" while the SDK returns "abiEncodedClearValues" — they map directly, just renamed.
- The claim flow now has TWO steps: requestClaim (already built in 2C) → fulfillClaim (new in 2D).
- A claim has these states: idle (no request) → requesting (tx in flight) → pending (tx mined, awaiting fulfillment) → finalizing (KMS decrypt + fulfill tx in flight) → done (paid).

EDIT: hooks/payroll/useEmployeeSalary.ts

Add to the existing hook:

NEW STATE / RETURNS:
- claimStage: "idle" | "requesting" | "pending" | "finalizing" | "done"
- pendingHandle: `0x${string}` | undefined  (the salary handle captured at requestClaim time, used for the public decrypt)
- finalizeClaim(): Promise<{ txHash: `0x${string}`; amountWei: bigint }>
- isFinalizing: boolean
- finalizeError: Error | null
- lastPaidAmountWei: bigint | undefined (set after a successful finalize)

IMPLEMENTATION:
- Import usePublicDecrypt from @zama-fhe/react-sdk.
- claimStage derives from existing flags:
  - "requesting" if isClaiming
  - "finalizing" if isFinalizing
  - "done" if lastPaidAmountWei is set AND lastRequestId is set AND !encryptedHandle (handle was zeroed by fulfillClaim → hook's salary read returns ZERO_HANDLE → encryptedHandle becomes undefined)
  - "pending" if lastRequestId is set AND !done AND !finalizing
  - "idle" otherwise
- When requestClaim succeeds (after the existing event-decode + setLastRequestId), ALSO setPendingHandle(encryptedHandle) before refetchHandle. This captures the handle at request time so the public-decrypt has a stable input even after refetches.
- finalizeClaim:
  1. require lastRequestId !== undefined and pendingHandle !== undefined; throw with helpful messages otherwise
  2. setIsFinalizing(true), setFinalizeError(null)
  3. Call publicDecrypt.mutateAsync([pendingHandle]) — this contacts the KMS via the Zama relayer
  4. Result has abiEncodedClearValues and decryptionProof. Build handlesList = [pendingHandle].
  5. Call writeContractAsync to invoke fulfillClaim(lastRequestId, handlesList, result.abiEncodedClearValues, result.decryptionProof). Use chainId 11155111. No gas override; fulfillClaim is small.
  6. Wait for receipt. Parse ClaimPaid event from logs to extract the amount (uint64). Set lastPaidAmountWei to BigInt(amount).
  7. refetchHandle (it should now be zeroed → encryptedHandle becomes undefined → claimStage becomes "done")
  8. return { txHash, amountWei: lastPaidAmountWei }
  9. On error: setFinalizeError, throw
  10. finally: setIsFinalizing(false)

EDIT: components/payroll/EmployeePanel.tsx

Replace the "Claim your salary" card with state-aware UI:

- claimStage === "idle":
  Show current "Request claim" button. Hide "lastRequestId" alert.

- claimStage === "requesting":
  Disabled button with spinner "Requesting…"

- claimStage === "pending":
  Replace the button with a TWO-row UI:
    Row 1: An info alert "Claim requested (ID: {lastRequestId}). Click below to fetch the decryption proof and finalize payment. This contacts Zama's KMS relayer and may take 30–60 seconds."
    Row 2: A green "Finalize claim & receive payment" button. Disabled if isFinalizing.

- claimStage === "finalizing":
  Disabled button "Fetching decryption proof and finalizing… (may take up to 60 seconds)" with a spinner.

- claimStage === "done":
  A large success alert: "Paid! You received {formatEther(lastPaidAmountWei)} ETH. Your salary has been reset to zero." with a subtle note: "Your employer can set a new salary at any time."
  No buttons.

Show finalizeError as alert-error below whatever main UI is rendered, if set.

CRITICAL POINTS:
- claimStage logic must be COMPUTED, not stored as separate state — derive it from primitives so it never gets stale.
- pendingHandle MUST be captured inside requestClaim's success path BEFORE refetchHandle, so even if the salary handle changes (won't, but defensively) we have a stable target.
- The contract's fulfillClaim is callable by anyone holding the proof — we don't need any special msg.sender; the connected wallet (which is the employee) submitting it is fine.
- After finalization, encryptedHandle goes undefined because the contract zeroed _salaries[employee] AND removed them from the array. The "Your encrypted salary" card will switch to its empty state on next refetch — that's correct behavior, don't fight it.
- Watch for race conditions: don't let the user click Finalize twice — disabled flag must be respected.

VERIFY:
- pnpm next:check-types — report results.
- Briefly start dev server, confirm HTTP 200, kill cleanly using `taskkill //PID <pid> //F` (note double slashes — single slash fails on Git Bash on Windows).

REPORT:
- Files modified
- Full source of useEmployeeSalary.ts
- Full source of EmployeePanel.tsx
- Type-check result
- Any TypeScript errors hit and how resolved

Stop after report. No commits, no on-chain testing.