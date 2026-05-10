export function Footer() {
  return (
    <footer className="border-t border-base-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:flex md:justify-between gap-4">
        <div className="text-sm opacity-60">
          <p className="m-0">Sealroll · Confidential payroll on Ethereum</p>
          <p className="m-0">Built with Zama fhEVM v0.11</p>
        </div>
        <div className="flex gap-4 text-sm mt-4 md:mt-0">
          <a
            href="https://sepolia.etherscan.io/address/0x32B413C9F6F274bA13A7978C467cDb3C2C833ead"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors duration-200"
          >
            Contract
          </a>
          <a
            href="https://docs.zama.ai/protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors duration-200"
          >
            Zama Protocol
          </a>
          <a href="#" className="hover:text-primary transition-colors duration-200">
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
