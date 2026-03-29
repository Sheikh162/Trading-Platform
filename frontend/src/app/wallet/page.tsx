import { TransactionTable } from "@/src/components/wallet/TransactionTable";
import { getTransactions } from "@/src/lib/wallet";
import { WalletActions } from "@/src/components/wallet/WalletActions";

export default async function WalletPage() {
    const transactions = await getTransactions();

    return (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-12 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-medium">Wallet & Funds</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_350px]">
                {/* Left: History */}
                <div className="space-y-3">
                    <h2 className="text-xl font-medium">Transaction History</h2>
                    <TransactionTable transactions={transactions} />
                </div>

                {/* Right: Actions */}
                <div>
                    <WalletActions />
                </div>
            </div>
        </div>
    );
}