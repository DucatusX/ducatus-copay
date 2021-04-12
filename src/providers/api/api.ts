export class ApiProvider {
  isProduction = false;
  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com',
      crowdsale: 'https://tokenization.centuriongm.com',
      pog: 'https://d-pog.com'
    },
    develop: {
      bitcore: 'https://duc-ws-dev.rocknblock.io',
      ducatuscoins: 'https://ducsite.rocknblock.io',
      crowdsale: 'http://duccrowdsale.rocknblock.io',
      pog: 'https://devgold.rocknblock.io'
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
