import { AuthenticationGate } from './shared/AuthenticationGate';
import { WalletGate } from './shared/WalletGate';

export const DepositScreen = () => {
  return (
    <AuthenticationGate
      title="Deposit to Privacy Pool"
      description="Create or load your account to start making private deposits"
      context="deposit"
    >
      <WalletGate
        title="Connect Wallet"
        description="Connect your wallet to fund privacy pool deposits"
      >
        <DepositForm />
      </WalletGate>
    </AuthenticationGate>
  );
};

const DepositForm = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-bold mb-4 text-center text-app-primary">
        Ready to Deposit!
      </h2>
      <p className="text-base text-center text-app-secondary">
        Deposit form will be implemented here.
      </p>
    </div>
  );
};