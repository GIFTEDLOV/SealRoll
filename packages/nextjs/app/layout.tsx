import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { DappWrapperWithProviders } from "~~/components/DappWrapperWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/helper/getMetadata";

export const metadata: Metadata = {
  ...getMetadata({
    title: "Sealroll — Confidential Payroll",
    description: "Encrypted salaries on Ethereum. Powered by Zama fhEVM.",
  }),
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
};

const DappWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=telegraf@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" forcedTheme="sealroll-dark">
          <DappWrapperWithProviders>{children}</DappWrapperWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default DappWrapper;
