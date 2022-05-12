import { ApiProvider } from '../api/api';
import { CoinsMap } from './currency';

export interface CoinOpts {
  // Bitcore-node
  name: string;
  chain: string;
  coin: string;
  unitInfo: {
    // Config/Precision
    unitName: string;
    unitToSatoshi: number;
    unitDecimals: number;
    unitCode: string;
  };
  properties: {
    // Properties
    hasMultiSig: boolean;
    hasMultiSend: boolean;
    isUtxo: boolean;
    isERCToken: boolean;
    isStableCoin: boolean;
    singleAddress: boolean;
  };
  paymentInfo: {
    paymentCode: string;
    protocolPrefix: { livenet: string; testnet: string };
    // Urls
    ratesApi: string;
    blockExplorerUrls: string;
    explorerName: string;
  };
  feeInfo: {
    // Fee Units
    feeUnit: string;
    feeUnitAmount: number;
    blockTime: number;
    maxMerchantFee: string;
  };
  theme: {
    backgroundColor: string;
    gradientBackgroundColor: string;
  };
}

const apiProvider: ApiProvider = new ApiProvider();
export const availableCoins: CoinsMap<CoinOpts> = {
  'duc': {
    name: 'Ducatus',
    chain: 'DUC',
    coin: 'duc',
    unitInfo: {
      unitName: 'DUC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'duc'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'ducatus', testnet: 'ducatus' },
      ratesApi: apiProvider.getAddresses().ratesApi,
      blockExplorerUrls: 'insight.ducatus.io/#/DUC/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(247,146,26,1)',
      gradientBackgroundColor: 'rgba(247,146,26, 0.2)'
    }
  },
  'ducx': {
    name: 'DucatusX',
    chain: 'DUCX',
    coin: 'ducx',
    unitInfo: {
      unitName: 'DUCX',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'ducx'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: apiProvider.getAddresses().ratesApi,
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(135,206,250,1)',
      gradientBackgroundColor: 'rgba(30,144,255, 0.2)'
    }
  },
  'btc': {
    name: 'Bitcoin',
    chain: 'BTC',
    coin: 'btc',
    unitInfo: {
      unitName: 'BTC',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'btc'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoin', testnet: 'bitcoin' },
      ratesApi: 'https://bitpay.com/api/rates',
      blockExplorerUrls: 'www.blockchain.com/btc/',
      explorerName: 'www.blockchain.com'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(247,146,26,1)',
      gradientBackgroundColor: 'rgba(247,146,26, 0.2)'
    }
  },
  'bch': {
    name: 'Bitcoin Cash',
    chain: 'BCH',
    coin: 'bch',
    unitInfo: {
      unitName: 'BCH',
      unitToSatoshi: 100000000,
      unitDecimals: 8,
      unitCode: 'bch'
    },
    properties: {
      hasMultiSig: true,
      hasMultiSend: true,
      isUtxo: true,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: false
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'bitcoincash', testnet: 'bchtest' },
      ratesApi: 'https://bitpay.com/api/rates/bch',
      blockExplorerUrls: 'insight.ducatus.io/#/BCH/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'sat/byte',
      feeUnitAmount: 1000,
      blockTime: 10,
      maxMerchantFee: 'normal'
    },
    theme: {
      backgroundColor: 'rgba(47,207,110,1)',
      gradientBackgroundColor: 'rgba(47,207,110, 0.2)'
    }
  },
  'eth': {
    name: 'Ethereum',
    chain: 'ETH',
    coin: 'eth',
    unitInfo: {
      unitName: 'ETH',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'eth'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/eth',
      blockExplorerUrls: 'insight.ducatus.io/#/ETH/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(135,206,250,1)',
      gradientBackgroundColor: 'rgba(30,144,255, 0.2)'
    }
  },
  'xrp': {
    name: 'XRP',
    chain: 'XRP',
    coin: 'xrp',
    unitInfo: {
      unitName: 'XRP',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'xrp'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: false,
      isStableCoin: false,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'BIP73',
      protocolPrefix: { livenet: 'ripple', testnet: 'ripple' },
      ratesApi: 'https://bitpay.com/api/rates/xrp',
      blockExplorerUrls: 'xrpscan.com/',
      explorerName: 'xrpscan.com'
    },
    feeInfo: {
      feeUnit: 'drops',
      feeUnitAmount: 1e6,
      blockTime: 0.05,
      maxMerchantFee: 'normal'
    },
    theme: {
      backgroundColor: 'rgba(35,41,47,1)',
      gradientBackgroundColor: 'rgba(68,79,91, 0.2)'
    }
  },
  'pax': {
    name: 'Paxos Standard',
    chain: 'ETH',
    coin: 'pax',
    unitInfo: {
      unitName: 'PAX',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'pax'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/pax',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/',
      explorerName: 'bitpay.com'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,132,93,1)',
      gradientBackgroundColor: 'rgba(0,209,147, 0.2)'
    }
  },
  'usdc': {
    name: 'USD Coin',
    chain: 'ETH',
    coin: 'usdc',
    unitInfo: {
      unitName: 'USDC',
      unitToSatoshi: 1e6,
      unitDecimals: 6,
      unitCode: 'usdc'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/usdc',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/',
      explorerName: 'bitpay.com'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(39,117,201,1)',
      gradientBackgroundColor: 'rgba(93,156,224, 0.2)'
    }
  },
  'gusd': {
    name: 'Gemini Dollar',
    chain: 'ETH',
    coin: 'gusd',
    unitInfo: {
      unitName: 'GUSD',
      unitToSatoshi: 1e2,
      unitDecimals: 2,
      unitCode: 'gusd'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ethereum', testnet: 'ethereum' },
      ratesApi: 'https://bitpay.com/api/rates/gusd',
      blockExplorerUrls: 'bitpay.com/insight/#/ETH/',
      explorerName: 'bitpay.com'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'jamasy': {
    name: 'JAMASY',
    chain: 'DUCX',
    coin: 'jamasy',
    unitInfo: {
      unitName: 'JAMASY',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'jamasy'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'nuyasa': {
    name: 'NUYASA',
    chain: 'DUCX',
    coin: 'nuyasa',
    unitInfo: {
      unitName: 'NUYASA',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'nuyasa'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'sunoba': {
    name: 'SUNOBA',
    chain: 'DUCX',
    coin: 'sunoba',
    unitInfo: {
      unitName: 'SUNOBA',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'sunoba'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'dscmed': {
    name: 'DSCMED',
    chain: 'DUCX',
    coin: 'dscmed',
    unitInfo: {
      unitName: 'DSCMED',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'dscmed'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'pog1': {
    name: 'POG1',
    chain: 'DUCX',
    coin: 'pog1',
    unitInfo: {
      unitName: 'POG1',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'pog1'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'wde': {
    name: 'WupDE',
    chain: 'DUCX',
    coin: 'wde',
    unitInfo: {
      unitName: 'WDE',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'wde'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'mdxb': {
    name: 'MarsaDXB',
    chain: 'DUCX',
    coin: 'mdxb',
    unitInfo: {
      unitName: 'MDXB',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'mdxb'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'g.o.l.d.': {
    name: 'G.O.L.D.',
    chain: 'DUCX',
    coin: 'g.o.l.d.',
    unitInfo: {
      unitName: 'G.O.L.D.',
      unitToSatoshi: 1e18,
      unitDecimals: 18,
      unitCode: 'g.o.l.d.'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'jwan': {
    name: 'Jwan',
    chain: 'DUCX',
    coin: 'jwan',
    unitInfo: {
      unitName: 'JWAN',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'jwan'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'tkf': {
    name: 'Takaful',
    chain: 'DUCX',
    coin: 'tkf',
    unitInfo: {
      unitName: 'TKF',
      unitToSatoshi: 1e8,
      unitDecimals: 8,
      unitCode: 'tkf'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  },
  'aa+': {
    name: 'AA+',
    chain: 'DUCX',
    coin: 'aa+',
    unitInfo: {
      unitName: 'AA+',
      unitToSatoshi: 1e5,
      unitDecimals: 5,
      unitCode: 'aa+'
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: true,
      singleAddress: true
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: { livenet: 'ducatusx', testnet: 'ducatusx' },
      ratesApi: 'https://bitpay.com/api/rates/',
      blockExplorerUrls: 'insight.ducatus.io/#/DUCX/',
      explorerName: 'insight.ducatus.io'
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e5,
      blockTime: 0.2,
      maxMerchantFee: 'urgent'
    },
    theme: {
      backgroundColor: 'rgba(0,220,250,1)',
      gradientBackgroundColor: 'rgba(72,233,255, 0.2)'
    }
  }
};
