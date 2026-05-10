# Zama fhEVM (v0.11) — Skill for AI Coding Agents

**Audience:** AI coding agents (Claude Code, Cursor, Copilot, GPT) building or modifying confidential dApps on Zama fhEVM v0.11.x.

**Source of truth:** lessons extracted from building [Sealroll](https://github.com/GIFTEDLOV/SealRoll), a confidential payroll dApp deployed on Sepolia, in ~36 hours. Each lesson here saved hours of real debugging.

Read this file BEFORE writing any fhEVM contract or React frontend that uses `@zama-fhe/sdk` or `@zama-fhe/react-sdk`. Many tutorials online describe pre-v0.11 patterns that no longer work.

---

## 1. The v0.11 decryption API breaking change

**Outdated pattern (pre-v0.11, still found in most tutorials):**
```solidity
FHE.requestDecryption(handle, callbackSelector, callbackData);
```
This was a push-based callback system. **It no longer exists.**

**Correct v0.11+ pattern (pull-based with public decrypt):**
```solidity
// Inside your "request" function:
FHE.makePubliclyDecryptable(encryptedHandle);
emit ClaimRequested(requestId, msg.sender);

// Inside your "fulfill" function (called separately, by anyone with the proof):
FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);
// — only after this passes can you safely act on the cleartext
```

The flow is:
1. Contract marks the ciphertext as publicly decryptable.
2. **Off-chain** the relayer (Zama KMS) produces a decryption proof.
3. Anyone (typically the user themselves) calls the fulfil function with the proof.
4. The contract verifies the proof on-chain and only then acts.

Never search for `requestDecryption` in v0.11+ contracts — that name is gone.

---

## 2. `delete` does not work on user-defined value types

```solidity
// Compile error:
delete _salaries[employee];   // _salaries: mapping(address => euint64)
```

`euint64` is a user-defined value type, and Solidity's `delete` does not support these.

**Correct zeroing pattern:**
```solidity
_salaries[employee] = euint64.wrap(bytes32(0));
```

This is the canonical "delete an encrypted slot" idiom. Applies to all `e*` types: `euint8`, `euint16`, `euint32`, `euint64`, `eaddress`, `ebool`.

---

## 3. `setSalary` / any function ingesting an external input handle needs a 15M gas override

When the client calls a contract function that takes `externalEuintXX` + `bytes proof`, the contract internally calls `FHE.fromExternal()` which performs heavy input verification. **The default gas estimation will be wrong** — the transaction silently reverts.

**Wagmi / viem write call:**
```ts
await writeContract({
  // ... normal args
  gas: 15_000_000n,   // REQUIRED for any externalEuintXX write
});
```

Without this override the dApp will look broken to users with no console error pointing to the cause. Apply this to every write that accepts encrypted input.

---

## 4. The `useEncrypt` flow on the frontend

The official `@zama-fhe/react-sdk` v3.0 hooks:

```ts
import { useEncrypt, useWriteContract } from "@zama-fhe/react-sdk";

const { encryptUint64 } = useEncrypt(CONTRACT_ADDRESS);

// Inside a handler:
const { handle, proof } = await encryptUint64(amountInWei);
await writeContract({
  abi, address: CONTRACT_ADDRESS, functionName: "setSalary",
  args: [employeeAddress, handle, proof],
  gas: 15_000_000n,
});
```

`encryptUint64` produces the `externalEuint64` handle and the corresponding proof. Both must be passed to the contract function in the same tx. Re-encrypt every time — handles are bound to specific input proofs.

---

## 5. WASM worker takes ~10 seconds on first page load

The Zama relayer SDK loads a WASM worker on first mount. **Calling encrypt before the worker initialises throws "Failed to initialize FHE worker."**

The current SDK does not expose a clean status hook. Two viable workarounds:

**Option A — 12-second init banner:**
```tsx
const [initBannerVisible, setBannerVisible] = useState(true);
useEffect(() => {
  const t = setTimeout(() => setBannerVisible(false), 12_000);
  return () => clearTimeout(t);
}, []);
```

**Option B — retry with backoff** in your encrypt handler. Both work; Option A is simpler and matches user expectations on a one-page dApp.

---

## 6. `useUserDecrypt` requires a one-time keypair signature

Reading your own encrypted state requires a **wallet signature** before the first decrypt:

```ts
import { useAllow, useIsAllowed, useUserDecrypt } from "@zama-fhe/react-sdk";

const { isAllowed } = useIsAllowed(CONTRACT_ADDRESS);
const { allow } = useAllow(CONTRACT_ADDRESS);

if (!isAllowed) {
  await allow();   // triggers one-time signature; persists in browser
}
const value = await userDecrypt(encryptedHandle);
```

Without calling `useAllow` first, `useUserDecrypt` returns `undefined` and may silently fail. Always check `useIsAllowed` first and gate the decrypt button on it.

---

## 7. Foundry + soldeer + Windows: the MAX_PATH trap

On Windows, building fhEVM contracts with Foundry's `soldeer` dependency manager hits the `MAX_PATH` (260 char) limit on transitive dependencies. Two failure modes:

- `recursive_deps = true` in `foundry.toml` → installs nested `node_modules`-like trees that overflow `MAX_PATH`. Compile fails.
- `recursive_deps = false` → top-level deps install fine, but `forge-fhevm`'s transitive `@openzeppelin/contracts/` imports break because they're never installed.

**Working configuration:**
```toml
# foundry.toml
[soldeer]
recursive_deps = false
```

```txt
# remappings.txt — manually redirect OZ to the top-level installation
@openzeppelin/contracts/=dependencies/@openzeppelin-contracts-5.1.0/contracts/
```

This works on Windows and Linux both.

---

## 8. ACL grants are required for both employee AND employer reads

After encrypting and storing an `euint64`, the contract must explicitly grant ACL access. Without it, even the employer cannot decrypt their own stored value via `useUserDecrypt`.

```solidity
function setSalary(address employee, externalEuint64 inputHandle, bytes calldata inputProof)
    external onlyEmployer
{
    euint64 salary = FHE.fromExternal(inputHandle, inputProof);
    _salaries[employee] = salary;

    FHE.allowThis(salary);              // contract itself
    FHE.allow(salary, employee);        // employee can decrypt own
    FHE.allow(salary, msg.sender);      // employer can decrypt too
}
```

Forgetting any of these three results in subtle decryption failures that don't surface as errors — just empty returns.

---

## 9. Self-removing pattern for one-shot claims

When a function transfers value and should "consume" the encrypted state, zero the handle AND remove from any tracking array in the SAME transaction:

```solidity
function fulfillClaim(uint256 requestId, ...) external {
    FHE.checkSignatures(...);   // verifies the proof — reverts on bad proof
    uint64 amount = ...;        // extracted from cleartexts
    address employee = _claimRequester[requestId];

    _salaries[employee] = euint64.wrap(bytes32(0));   // zero the slot
    _removeEmployeeFromList(employee);                // swap-pop from array
    payable(employee).transfer(amount);
    emit ClaimPaid(requestId, employee, amount);
}
```

This pattern keeps on-chain state minimal and makes "currently active employees" a single source of truth via the array.

---

## 10. The encrypted handle is `bytes32` — be explicit when reading

`getSalary()` returns `euint64`. When passing it to the frontend, treat it as `bytes32`:

```solidity
function getSalary(address employee) external view returns (euint64) {
    return _salaries[employee];
}
```

```ts
// Frontend:
const handle = await readContract({ ... functionName: "getSalary", ... }) as `0x${string}`;
// handle is bytes32 — pass directly to useUserDecrypt(handle).
```

A handle that's `0x0000...0000` means "no salary set" — not "decrypt error." Check for this explicitly.

---

## Quick checklist for any new fhEVM dApp

Before writing code, confirm:

- [ ] Using `@fhevm/solidity` >= 0.11.0 (not 0.6.x — different API)
- [ ] Foundry config has `recursive_deps = false` + explicit OZ remapping
- [ ] All write functions accepting `externalEuintXX` set `gas: 15_000_000n` on the client
- [ ] All store-encrypted-data functions call `FHE.allowThis` + `FHE.allow(handle, accessor)` for every reader
- [ ] Decryption uses the v0.11 `makePubliclyDecryptable` + `checkSignatures` pattern, NOT the old `requestDecryption` callback
- [ ] Frontend gates encrypt actions on a 10–12 second WASM init delay
- [ ] User decryption flow calls `useAllow` + checks `useIsAllowed` before `useUserDecrypt`
- [ ] Empty / zeroed handles (`bytes32(0)`) are checked explicitly in the UI

## License

This skill is released under MIT. Adapt freely.

EOF.
