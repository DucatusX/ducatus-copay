import { Injectable } from '@angular/core';

@Injectable()
export class DerivationPathHelperProvider {
  public defaultBTC: string;
  public defaultBCH: string;
  public defaultETH: string;
  public defaultDUCX: string;
  public defaultDUC: string;
  public defaultTestnet: string;
  public defaultMultisigBTC: string;
  public defaultMultisigBCH: string;
  public defaultMultisigDUC: string;

  public constructor() {
    this.defaultBTC = "m/44'/1025'/0'";
    this.defaultDUC = "m/44'/0'/0'";
    this.defaultBCH = "m/44'/145'/0'";
    this.defaultETH = "m/44'/60'/0'";
    this.defaultDUCX = "m/44'/1060'/0'";
    this.defaultMultisigBTC = "m/48'/1025'/0'";
    this.defaultMultisigDUC = "m/44'/0'/0'";
    this.defaultMultisigBCH = "m/48'/145'/0'";
    this.defaultTestnet = "m/44'/1'/0'";
  }

  public parsePath(path: string) {
    return {
      purpose: path.split('/')[1],
      coinCode: path.split('/')[2],
      account: path.split('/')[3]
    };
  }

  public getDerivationStrategy(path: string): string {
    const purpose = this.parsePath(path).purpose;
    let derivationStrategy: string;

    switch (purpose) {
      case "44'":
        derivationStrategy = 'BIP44';
        break;
      case "45'":
        derivationStrategy = 'BIP45';
        break;
      case "48'":
        derivationStrategy = 'BIP48';
        break;
    }
    return derivationStrategy;
  }

  public getNetworkName(path: string): string {
    // BIP45
    const purpose = this.parsePath(path).purpose;
    if (purpose == "45'") return 'livenet';

    const coinCode = this.parsePath(path).coinCode;
    let networkName: string;

    switch (coinCode) {
      case "1025'": // for BTC
        networkName = 'livenet';
        break;
      case "0'": // for DUC
        networkName = 'livenet';
        break;
      case "1'": // testnet for all coins
        networkName = 'testnet';
        break;
      case "145'": // for BCH
        networkName = 'livenet';
        break;
      case "60'": // for ETH
        networkName = 'livenet';
        break;
      case "1060'": // for DUCX
        networkName = 'livenet';
        break;
    }
    return networkName;
  }

  public getAccount(path: string): number {
    // BIP45
    const purpose = this.parsePath(path).purpose;
    if (purpose == "45'") return 0;

    const account = this.parsePath(path).account || '';
    const match = account.match(/(\d+)'/);
    if (!match) return undefined;
    return +match[1];
  }

  public isValidDerivationPathCoin(path: string, coin: string): boolean {
    let isValid: boolean;
    const coinCode = this.parsePath(path).coinCode;

    // BIP45
    if (path == "m/45'") return true;

    switch (coin) {
      case 'btc':
        isValid = ["1025'", "1'"].indexOf(coinCode) > -1;
        break;
      case 'bch':
        isValid = ["145'", "0'", "1'"].indexOf(coinCode) > -1;
        break;
      case 'duc':
        isValid = ["0'", "0'", "1'"].indexOf(coinCode) > -1;
        break;
      case 'eth':
        isValid = ["60'", "0'", "1'"].indexOf(coinCode) > -1;
        break;
      case 'ducx':
        isValid = ["1060'", "0'", "1'"].indexOf(coinCode) > -1;
        break;
    }

    return isValid;
  }
}
