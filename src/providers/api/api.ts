export class ApiProvider {
  public isProduction = false;
  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://d-pog.com',
      ratesApi: 'https://rates.ducatuscoins.com/api/v1/rates/',
      swap: {
        status: 'https://www.ducatuscoins.com/api/v4/status/',
        network: 'https://www.ducatuscoins.com/api/v4/networks/',
        bsc:
          'https://www.ducatuscoins.com/api/v4/token_balance/Binance-Smart-Chain/',
        address: '0x1D85186b5d9C12a6707D5fd3ac7133d58F437877'
      }
    },
    develop: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://ducsite.rocknblock.io',
      crowdsale: 'https://tokenization.centuriongm.com',
      // сейчас работает только прод апи
      // crowdsale: 'http://duccrowdsale.rocknblock.io',
      pog: 'https://devgold.rocknblock.io',
      ratesApi: 'https://ducexpl.rocknblock.io/api/v1/rates/',
      swap: {
        status: 'https://wducx.rocknblock.io/api/v1/status/',
        network: 'https://wducx.rocknblock.io/api/v1/networks/',
        bsc:
          'https://wducx.rocknblock.io/api/v1/token_balance/Binance-Smart-Chain/',
        address: '0xd51bd30A91F88Dcf72Acd45c8A1E7aE0066263e8'
      }
    }
  };

  public getAddresses() {
    if (this.isProduction) {
      return this.config.prod;
    } else {
      return this.config.develop;
    }
  }
}
