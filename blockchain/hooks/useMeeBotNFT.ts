
// blockchain/hooks/useMeeBotNFT.ts
import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES, MeeBotNFTABI } from '../contract/addresses';

const meeBotNFTConfig = {
  address: CONTRACT_ADDRESSES.MeeBotNFT,
  abi: MeeBotNFTABI,
} as const;

export const useMeeBotNFT = () => {
  const { address } = useAccount();

  // READS
  const { data: name, isLoading: isLoadingName } = useReadContract({
    ...meeBotNFTConfig,
    functionName: 'name',
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({
    ...meeBotNFTConfig,
    functionName: 'symbol',
  });

  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    ...meeBotNFTConfig,
    functionName: 'totalSupply',
  });

  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    ...meeBotNFTConfig,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: !!address,
    },
  });

  // WRITES
  const { writeContractAsync: mintMeeBot, isPending: isMinting, hash } = useWriteContract();

  const handleMint = async (uri: string) => {
    if (!address) throw new Error("Wallet not connected");
    return await mintMeeBot({
      ...meeBotNFTConfig,
      functionName: 'mintMeeBot',
      args: [uri],
    });
  };

  return {
    // Properties
    name,
    symbol,
    totalSupply,
    balance,
    isMinting,
    hash,
    isLoading: isLoadingName || isLoadingSymbol || isLoadingTotalSupply || isLoadingBalance,

    // Functions
    mintMeeBot: handleMint,
  };
};
