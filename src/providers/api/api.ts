import env from '../../environments';

export class ApiProvider {

  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://d-pog.com',
      ratesApi: 'https://rates.ducatuscoins.com/api/v1/rates/',
      deposit: 'https://www.ducatuscoins.com',
      getExchange:{
        livenet: "https://www.ducatuscoins.com",
        testnet: "https://devducatus.rocknblock.io"
      },
      swap: {
        status: 'https://www.ducatuscoins.com/api/v4/status/',
        network: 'https://www.ducatuscoins.com/api/v4/networks/',
        bsc:
          'https://www.ducatuscoins.com/api/v4/token_balance/Binance-Smart-Chain/'
        // address: '0x1D85186b5d9C12a6707D5fd3ac7133d58F437877' // адрес в мейннете
      }
    },
    develop: {
      bitcore: 'https://duc-ws-dev.rocknblock.io',
      ducatuscoins: 'https://devducatus.rocknblock.io',
      crowdsale: 'https://tokenization.centuriongm.com',
      // сейчас работает только прод апи
      // crowdsale: 'http://duccrowdsale.rocknblock.io',
      pog: 'https://devgold.rocknblock.io',
      ratesApi: 'https://ducexpl.rocknblock.io/api/v1/rates/',
      deposit: 'https://www.ducatuscoins.com',
      //сейчас работает только прод апи
      //deposit: 'https://ducsite.rocknblock.io/',
      getExchange:{
        livenet: "https://www.ducatuscoins.com",
        testnet: "https://devducatus.rocknblock.io"
      },
      swap: {
        status: 'https://wducx.rocknblock.io/api/v1/status/',
        network: 'https://wducx.rocknblock.io/api/v1/networks/',
        bsc:
          'https://wducx.rocknblock.io/api/v1/token_balance/Binance-Smart-Chain/'
        // address: '0xd51bd30A91F88Dcf72Acd45c8A1E7aE0066263e8' // старый адрес в тестнете
        // address: '0xc5228008C89DfB03937Ff5ff9124f0d7bd2028F9' // новый адрес в мейннете
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
