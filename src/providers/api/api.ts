
export  class ApiProvider {
  private config = {
    prod: {
      bitcore: 'https://ducws.rocknblock.io',
      ducatuscoins: 'https://www.ducatuscoins.com'
    },
    develop: {
      bitcore: 'https://duc-ws-dev.rocknblock.io',
      ducatuscoins: 'https://ducsite.rocknblock.io'
    }
  }
  private isDevelop = true;

  public getAddresses() {
    if (this.isDevelop) {
      return this.config.develop
    } else {
      return this.config.prod
    }
  }

}