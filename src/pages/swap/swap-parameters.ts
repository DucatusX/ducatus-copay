export interface ICoinsInfo {
  symbol: string;
  name: string;
  toSwap: string[];
  isSend: boolean;
  isGet: boolean;
  sendDefault: boolean;
  getDefault: boolean;
  isAvailableSwap: boolean;
  decimals: number;
}

export const coinsInfo: ICoinsInfo[] = [
  { 
    symbol: 'DUCX',
    name: 'DucatusX',
    toSwap: ['DUC', 'WDUCX'],
    isSend: true,
    isGet: true,
    sendDefault: false,
    getDefault: true,
    isAvailableSwap: true,
    decimals: 18
  },
  { 
    symbol: 'DUC',
    name: 'Ducatus',
    toSwap: ['DUCX'],
    isSend: true,
    isGet: true,
    getDefault: false,
    sendDefault: true,
    isAvailableSwap: true,
    decimals: 8
  },
  { 
    symbol: 'BTC',
    name: 'Bitcoin', 
    toSwap: ['DUC'],
    isSend: true,
    isGet: false,
    sendDefault: false,
    getDefault: false,
    isAvailableSwap: true,
    decimals: 8
  },
  { 
    symbol: 'ETH',
    name: 'Etherium',
    toSwap: ['DUC'],
    isSend: true,
    isGet: false,
    sendDefault: false,
    getDefault: false,
    isAvailableSwap: true,
    decimals: 18
  }, 
  { 
    symbol: 'WDUCX',
    name: 'Wrapped DucatusX',
    toSwap: ['DUCX'],
    isSend: false, 
    isGet: true,
    sendDefault: false,
    getDefault: false,
    isAvailableSwap: false,
    decimals: 18
  }
];