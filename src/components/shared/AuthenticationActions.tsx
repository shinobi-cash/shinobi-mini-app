import { useState } from 'react';
import { Button } from '../ui/button';
import { CreateAccountDrawer } from '../CreateAccountDrawer';
import { LogInDrawer } from '../LogInDrawer';

interface AuthenticationActionsProps {
  context?: 'profile' | 'deposit' | 'withdraw';
}

export const AuthenticationActions = ({ context: _ }: AuthenticationActionsProps) => {
  const [openCreateAccount, setOpenCreateAccount] = useState(false);
  const [openAccountLogin, setOpenAccountLogin] = useState(false);

  return (
    <div className="w-full flex flex-col gap-4">
      <Button
        variant="default"
        className="w-full h-12 text-base font-medium rounded-2xl"
        onClick={() => {
          setOpenAccountLogin(true);
        }}
        size="lg"
      >
        Log In
      </Button>
      
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium rounded-2xl border border-app"
        onClick={() => {
          setOpenCreateAccount(true);
        }}
        size="lg"
      >
        Create Account
      </Button>

      <CreateAccountDrawer 
        open={openCreateAccount}
        onOpenChange={setOpenCreateAccount}
      />

      <LogInDrawer
        open={openAccountLogin}
        onOpenChange={setOpenAccountLogin}
        onSessionInitialized={() => setOpenAccountLogin(false)}
      />
    </div>
  );
};