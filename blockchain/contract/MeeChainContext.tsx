
// src/contexts/MeeChainContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  useUserCards, 
  useActiveMissions,
  useMintCard,
  useCompleteMission 
} from '../hooks/useMeeChain';
import { useMeeBotNFT } from '../hooks/useMeeBotNFT'; // Import the new hook
import { CardRarity } from '../contracts/addresses';

// Types
type Card = {
  id: number;
  tokenId: bigint;
  name: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  ipfsHash: string;
  image: string;
  locked: boolean;
};

type Mission = {
  id: number;
  missionId: bigint;
  name: string;
  description: string;
  requiredCards: number[];
  minRarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  reward: string;
  progress: number;
  canComplete: boolean;
  expiresIn: string;
};

type MeeChainContextType = {
  // Account
  address: `0x${string}` | undefined;
  isConnected: boolean;
  
  // Cards
  cards: Card[];
  loadingCards: boolean;
  refreshCards: () => void;
  mintNewCard: (rarity: CardRarity, ipfsHash: string) => Promise<void>;
  
  // Missions
  missions: Mission[];
  loadingMissions: boolean;
  refreshMissions: () => void;
  completeMissionById: (missionId: bigint) => Promise<void>;

  // MeeBotNFT
  meeBotName?: string;
  meeBotSymbol?: string;
  meeBotTotalSupply?: bigint;
  meeBotBalance?: bigint;
  isLoadingMeeBot: boolean;
  mintMeeBot: (uri: string) => Promise<void>;
  
  // UI State
  isProcessing: boolean;
  lastTxHash: string | null;
};

const MeeChainContext = createContext<MeeChainContextType | undefined>(undefined);

// Helper: Convert rarity enum to string
const rarityToString = (rarity: CardRarity): 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' => {
  const map = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;
  return map[rarity] || 'COMMON';
};

// Helper: Get emoji for rarity
const getCardEmoji = (rarity: string): string => {
  const emojiMap: Record<string, string> = {
    COMMON: '🎯',
    RARE: '🏰',
    EPIC: '⚔️',
    LEGENDARY: '🌟',
  };
  return emojiMap[rarity] || '🎴';
};

export const MeeChainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  
  // Wagmi hooks
  const { cardIds, isLoading: loadingCards, refetch: refetchCards } = useUserCards();
  const { missionIds, isLoading: loadingMissions, refetch: refetchMissions } = useActiveMissions();
  const { mintCard, isPending: isMintingCard, hash: mintCardHash } = useMintCard();
  const { completeMission, isPending: isCompleting, hash: completeHash } = useCompleteMission();
  const { 
    name: meeBotName,
    symbol: meeBotSymbol,
    totalSupply: meeBotTotalSupply,
    balance: meeBotBalance,
    isLoading: isLoadingMeeBot,
    isMinting: isMintingMeeBot,
    mintMeeBot: mintMeeBotAction,
    hash: meeBotHash
  } = useMeeBotNFT();
  
  // Local state
  const [cards, setCards] = useState<Card[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Transform cardIds to Card objects with mock data
  useEffect(() => {
    if (!cardIds || cardIds.length === 0) {
      setCards(prev => prev.length === 0 ? prev : []);
      return;
    }

    const transformedCards: Card[] = cardIds.map((tokenId, index) => {
      const rarities: Array<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'> = 
        ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
      const rarity = rarities[index % 4];
      
      return {
        id: Number(tokenId),
        tokenId,
        name: `MeeCard #${tokenId}`,
        rarity,
        ipfsHash: `Qm${tokenId.toString()}`,
        image: getCardEmoji(rarity),
        locked: false,
      };
    });

    setCards(transformedCards);
  }, [cardIds]);

  // Transform missionIds to Mission objects
  useEffect(() => {
    if (!missionIds || missionIds.length === 0) {
      setMissions(prev => prev.length === 0 ? prev : []);
      return;
    }

    const transformedMissions: Mission[] = missionIds.map((missionId, index) => {
      const missionData = [
        {
          name: 'Complete Your Profile',
          description: 'Set up your MeeBot profile and connect wallet',
          reward: 'Profile Badge NFT',
          minRarity: 'COMMON' as const,
        },
        {
          name: 'Collector\'s Journey',
          description: 'Collect 3 different rarity cards',
          reward: 'Collector Achievement',
          minRarity: 'RARE' as const,
        },
        {
          name: 'Legendary Hunter',
          description: 'Acquire your first Legendary card',
          reward: 'Legendary Frame',
          minRarity: 'LEGENDARY' as const,
        },
      ];

      const data = missionData[index % 3];
      
      return {
        id: Number(missionId),
        missionId,
        name: data.name,
        description: data.description,
        requiredCards: [],
        minRarity: data.minRarity,
        reward: data.reward,
        progress: index * 10 % 100,
        canComplete: index % 2 === 0,
        expiresIn: `${7 + index * 7} days`,
      };
    });

    setMissions(transformedMissions);
  }, [missionIds]);

  // Update last tx hash
  useEffect(() => {
    if (mintCardHash) setLastTxHash(mintCardHash);
    if (completeHash) setLastTxHash(completeHash);
    if (meeBotHash) setLastTxHash(meeBotHash);
  }, [mintCardHash, completeHash, meeBotHash]);

  // Functions
  const mintNewCard = async (rarity: CardRarity, ipfsHash: string) => {
    if (!address) throw new Error('Wallet not connected');
    await mintCard({ args: [address, rarity, ipfsHash] }); // Adjusted for wagmi v2
    setTimeout(() => refetchCards(), 2000);
  };

  const completeMissionById = async (missionId: bigint) => {
    await completeMission({ args: [missionId] }); // Adjusted for wagmi v2
    setTimeout(() => {
      refetchCards();
      refetchMissions();
    }, 2000);
  };

  const mintMeeBot = async (uri: string) => {
    await mintMeeBotAction(uri);
    // You might want to refetch the balance or total supply after minting
  };

  const value: MeeChainContextType = {
    // Account
    address,
    isConnected,
    
    // Cards
    cards,
    loadingCards,
    refreshCards: refetchCards,
    mintNewCard,
    
    // Missions
    missions,
    loadingMissions,
    refreshMissions: refetchMissions,
    completeMissionById,
    
    // MeeBotNFT
    meeBotName,
    meeBotSymbol,
    meeBotTotalSupply,
    meeBotBalance,
    isLoadingMeeBot,
    mintMeeBot,

    // UI State
    isProcessing: isMintingCard || isCompleting || isMintingMeeBot,
    lastTxHash,
  };

  return <MeeChainContext.Provider value={value}>{children}</MeeChainContext.Provider>;
};

export const useMeeChainContext = () => {
  const context = useContext(MeeChainContext);
  if (!context) {
    throw new Error('useMeeChainContext must be used within MeeChainProvider');
  }
  return context;
};
