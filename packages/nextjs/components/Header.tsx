"use client";

import Image from "next/image";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-base-300 bg-base-100/95 backdrop-blur">
      <div className="max-w-7xl mx-auto pl-2 sm:pl-3 pr-4 sm:pr-6 h-16 flex items-center justify-between">
        <div className="ml-2 sm:ml-4">
          <Link href="/">
            <Image src="/logo.png" alt="Sealroll" width={220} height={58} priority className="mt-1" style={{ height: "auto" }} />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </header>
  );
};
