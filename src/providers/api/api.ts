import env from '../../environments';

export class ApiProvider {

  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://d-pog.com',
      ratesApi: 'https://rates.ducatuscoins.com/api/v1/rates/',
      deposit: 'https://www.ducatuscoins.com/api/v5/',
      nftSeed: 'https://nft.goldxb.com/api/v1/nfts/',
      getExchange:{
        livenet: "https://www.ducatuscoins.com",
        testnet: "https://devducatus.rocknblock.io"
      },
      swap: {
        status: 'https://www.ducatuscoins.com/api/v4/status/',
        network: 'https://www.ducatuscoins.com/api/v4/networks/',
        bsc: 'https://www.ducatuscoins.com/api/v4/token_balance/Binance-Smart-Chain/'
       
      }
    },
    develop: {
      bitcore: 'https://duc-ws-dev.rocknblock.io',
      ducatuscoins: 'https://devducatus.rocknblock.io',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://devgold.rocknblock.io',
      ratesApi: 'https://ducexpl.rocknblock.io/api/v1/rates/',
      deposit: 'https://dev-vouchers.rocknblock.io/api/v1/',
      nftSeed: 'https://dev-seed.rocknblock.io/api/v1/nfts/',
      getExchange:{
        livenet: "https://www.ducatuscoins.com",
        testnet: "https://devducatus.rocknblock.io"
      },
      swap: {
        status: 'https://wducx.rocknblock.io/api/v1/status/',
        network: 'https://wducx.rocknblock.io/api/v1/networks/',
        bsc: 'https://wducx.rocknblock.io/api/v1/token_balance/Binance-Smart-Chain/'
      }
    }
  };

  public getAddresses() {
    // if you want build dev:
    // # npm run build:desktop
    // if you want build prod: 
    // # npm run build:desktop-release
    const mode: string = env && env.name;

    if ( mode === 'production' ) {
      // tslint:disable-next-line:no-console
      console.log(`BWS: ${this.config.develop.bitcore}`);
      return this.config.prod;
    } else {
      // tslint:disable-next-line:no-console
      console.log(`BWS: ${this.config.develop.bitcore}`);
      return this.config.develop;
    }
  }
}
