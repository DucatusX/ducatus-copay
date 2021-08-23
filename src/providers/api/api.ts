export class ApiProvider {
  public isProduction = false;
  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://d-pog.com',
      ratesApi: 'https://rates.ducatuscoins.com/api/v1/rates/',
      wduc: 'https://www.ducatuscoins.com/api/v4/status/'
    },
    develop: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://ducsite.rocknblock.io',
      crowdsale: 'https://tokenization.centuriongm.com',
      // сейчас работает только прод апи
      // crowdsale: 'http://duccrowdsale.rocknblock.io',
      pog: 'https://devgold.rocknblock.io',
      ratesApi: 'https://ducexpl.rocknblock.io/api/v1/rates/',
      wduc: 'https://wducx.rocknblock.io/api/v1/status/'
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
