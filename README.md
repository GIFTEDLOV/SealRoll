<div align="center">

# Sealroll

**Confidential payroll on Ethereum, powered by Zama fhEVM.**

Pay your team without exposing their salaries on a public blockchain. Salaries are encrypted on-chain. Only the people you pay can read what they earn. Real ETH transfers, no off-chain trust.

[Live demo](⟨LIVE_URL⟩) · [3-minute video](⟨VIDEO_URL⟩) · [Contract on Etherscan](https://sepolia.etherscan.io/address/0x32B413C9F6F274bA13A7978C467cDb3C2C833ead)

![Sepolia](https://img.shields.io/badge/Sepolia-live-22C55E?style=flat-square) ![Zama fhEVM](https://img.shields.io/badge/Zama-fhEVM%20v0.11-F5C518?style=flat-square) ![Solidity](https://img.shields.io/badge/Solidity-0.8.27-blue?style=flat-square) ![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square)

</div>

---

## The problem

A payroll on a public blockchain leaks salaries to the world. Anyone can index the contract, read storage, and see exactly what every person earns. For real-world finance — payroll, treasury operations, RWAs — that's a non-starter. The "transparent ledger" is a feature for assets and a privacy disaster for people.

## The solution

Sealroll keeps salaries encrypted in contract storage using **fully homomorphic encryption** via Zama's fhEVM. The contract never holds plaintext salaries. Only addresses you authorise can decrypt them, and decryption happens client-side or via Zama's KMS — never in a server you have to trust.

When an employee claims, the protocol's KMS produces a verified decryption proof, the contract checks the proof on-chain, and ETH transfers directly to the employee's wallet. The amount only becomes briefly visible at the exact moment payment moves — which is what banks see in the real world anyway.

## How it works