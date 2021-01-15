export interface Token {
  name: string;
  symbol: string;
  decimal: number;
  address: string;
  blockchain?: string;
}

export const TokenOpts = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimal: 6,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  },
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1': {
    name: 'Paxos Standard',
    symbol: 'PAX',
    decimal: 18,
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1'
  },
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd': {
    name: 'Gemini Dollar',
    symbol: 'GUSD',
    decimal: 2,
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd'
  }
};
export const DRCTokenOpts = {
  '0xa9CB8e18E4C2C0a1C9Bf4367E7115165ed7e41F0': {
    name: 'Jazz Makati 1638',
    symbol: 'JAMASY',
    decimal: 8,
    address: '0xa9CB8e18E4C2C0a1C9Bf4367E7115165ed7e41F0',
    blockchain: 'ducx'
  },
  '0x3D30806b1E1F021Fe12DF506C3A1F96CfB94464a': {
    name: 'Nucleus Yasmin Salalah',
    symbol: 'NUYASA',
    decimal: 8,
    address: '0x3D30806b1E1F021Fe12DF506C3A1F96CfB94464a',
    blockchain: 'ducx'
  },
  '0xB7A7221E37d12A8Ea92468F283422B16DbC364D9': {
    name: 'Supernova Bali',
    symbol: 'SUNOBA',
    decimal: 8,
    address: '0xB7A7221E37d12A8Ea92468F283422B16DbC364D9',
    blockchain: 'ducx'
  }
};
