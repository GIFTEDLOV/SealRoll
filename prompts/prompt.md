Update the live URL across the codebase from placeholder to sealroll.vercel.app.

1. Read README.md and find the "Live demo" link. It currently points to https://sealroll.vercel.app already (was set as the placeholder during initial draft, lucky guess). Verify by showing me the line.

2. Read packages/nextjs/components/Footer.tsx. If the Footer has any href that's a placeholder URL, github URL, etherscan URL, or zama URL, leave them. But if there's a "Live demo" or self-referencing URL, update to https://sealroll.vercel.app.

3. Read packages/nextjs/app/layout.tsx. Find the metadata block (export const metadata). If there's a metadataBase or openGraph url, set it to "https://sealroll.vercel.app". If there isn't one, ADD this to the metadata object:
     metadataBase: new URL("https://sealroll.vercel.app"),
     openGraph: {
       title: "Sealroll — Confidential payroll on Ethereum",
       description: "Pay your team without exposing salaries on a public blockchain. Powered by Zama fhEVM.",
       url: "https://sealroll.vercel.app",
       siteName: "Sealroll",
     },
     twitter: {
       card: "summary_large_image",
       title: "Sealroll — Confidential payroll on Ethereum",
       description: "Pay your team without exposing salaries on a public blockchain. Powered by Zama fhEVM.",
     },

4. Run pnpm next:check-types — confirm clean.

5. Commit and push:
   git add -A
   git commit --no-verify -m "Wire live URL: sealroll.vercel.app"
   git push

6. Show full output of every command. Stop after push.