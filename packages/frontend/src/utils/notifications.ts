import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
      style: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#fff',
      },
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      style: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fff',
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: 'rgba(147, 51, 234, 0.1)',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        color: '#fff',
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading = 'Loading...',
      success = 'Success!',
      error = 'Something went wrong'
    }: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    }, {
      style: {
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        color: '#fff',
      },
    });
  },

  custom: (message: string, emoji: string = '💡') => {
    toast(message, {
      icon: emoji,
      duration: 4000,
      style: {
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        color: '#fff',
      },
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};

// Blockchain-specific notifications
export const blockchainNotify = {
  transactionPending: (hash?: string) => {
    return notify.loading(
      hash 
        ? `Transaction pending: ${hash.slice(0, 10)}...`
        : 'Transaction pending...'
    );
  },

  transactionSuccess: (hash?: string) => {
    notify.success(
      hash 
        ? `Transaction confirmed: ${hash.slice(0, 10)}...`
        : 'Transaction confirmed!'
    );
  },

  transactionError: (error: any) => {
    const message = error?.reason || error?.message || 'Transaction failed';
    notify.error(message);
  },

  walletRequired: () => {
    notify.error('Please connect your wallet to continue');
  },

  networkError: () => {
    notify.error('Network error. Please check your connection.');
  },

  insufficientFunds: () => {
    notify.error('Insufficient funds for this transaction');
  }
};

// Game-specific notifications
export const gameNotify = {
  levelUp: (level: number) => {
    notify.custom(`Level ${level} achieved! 🎉`, '⭐');
  },

  lootFound: (item: string) => {
    notify.custom(`Found: ${item}`, '💰');
  },

  combatVictory: () => {
    notify.success('Victory! Enemy defeated! ⚔️');
  },

  combatDefeat: () => {
    notify.error('Defeated! Better luck next time! 💀');
  },

  partyJoined: (partyName: string) => {
    notify.success(`Joined party: ${partyName} 🏛️`);
  },

  partyLeft: () => {
    notify.custom('Left the party', '👋');
  },

  equipmentLent: (item: string) => {
    notify.success(`Equipment lent: ${item} 🤝`);
  },

  equipmentBorrowed: (item: string) => {
    notify.success(`Equipment borrowed: ${item} 📦`);
  }
};
