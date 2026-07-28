import { IbkrDashboard } from "@/components/broker/ibkr-dashboard";

export default function BrokerPage() {
  return (
    <main className="min-h-screen bg-[#080b10] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <IbkrDashboard />
      </div>
    </main>
  );
}
