"use client";

import { Eye, Lock, Zap } from "lucide-react";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";

const features = [
  {
    icon: <Lock size={32} className="text-primary" />,
    title: "Encrypted on-chain",
    description: "Salaries live on-chain as ciphertexts. Only addresses you authorise can decrypt them.",
  },
  {
    icon: <Eye size={32} className="text-primary" />,
    title: "Privacy-preserving by default",
    description: "Coworkers, observers, and indexers cannot see what you earn — even on a fully public blockchain.",
  },
  {
    icon: <Zap size={32} className="text-primary" />,
    title: "Real ETH payments",
    description: "When you claim, the protocol reveals only your amount, then transfers the ETH directly to your wallet.",
  },
];

const steps = [
  {
    title: "Employer encrypts salaries",
    description:
      "Each salary is encrypted client-side and submitted to the smart contract. Even the contract owner can't see the values.",
  },
  {
    title: "Employee decrypts privately",
    description:
      "Your wallet derives a one-time keypair to decrypt your own salary inside the browser. No server, employer, or third party ever sees the cleartext.",
  },
  {
    title: "Claim transfers ETH",
    description:
      "Click claim. Zama's key management network produces a verified decryption proof, the contract checks the proof on-chain, and the payment transfers to your wallet.",
  },
];

export function LandingPage() {
  return (
    <div className="pb-20">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 text-center max-w-4xl mx-auto px-4">
        <span className="badge badge-outline badge-sm gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live on Sepolia testnet
        </span>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mt-6 tracking-tight leading-[1.05]">
          Confidential payroll,{" "}
          <span className="text-primary">on chain</span>.
        </h1>

        <p className="text-lg md:text-xl text-base-content/70 mt-6 max-w-2xl mx-auto">
          Pay your team without exposing their salaries on-chain. Sealroll uses fully homomorphic encryption to keep
          every payment private — even on Ethereum&apos;s public ledger.
        </p>

        <div className="mt-10 flex justify-center">
          <RainbowKitCustomConnectButton />
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────────── */}
      <section className="mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {features.map(f => (
          <div
            key={f.title}
            className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-all duration-200 hover:-translate-y-1"
          >
            <div className="card-body items-start">
              {f.icon}
              <h2 className="card-title text-xl mt-2">{f.title}</h2>
              <p className="text-base-content/70 text-base m-0">{f.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="mt-24 md:mt-32 max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center">How it works</h2>

        <div className="flex flex-col gap-6 mt-8">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg shrink-0">
                {i + 1}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-base-content/70 text-base md:text-lg mt-1 m-0">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
