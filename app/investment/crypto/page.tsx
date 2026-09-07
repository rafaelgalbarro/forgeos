"use client";

import dynamic from "next/dynamic";

const AssetClassModuleWorkspace = dynamic(
  () =>
    import("@/components/investment/AssetClassModuleWorkspace").then(
      (m) => m.AssetClassModuleWorkspace,
    ),
  { ssr: false, loading: () => <div className="p-4 text-sm opacity-70">Loading Crypto…</div> },
);

export default function InvestmentCryptoPage() {
  return <AssetClassModuleWorkspace module="crypto" />;
}
