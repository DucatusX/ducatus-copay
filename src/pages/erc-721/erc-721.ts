import { Component, ViewChild } from '@angular/core';
import { NavParams, Slides } from 'ionic-angular';
import { WalletProvider } from '../../providers';

import Web3 from 'web3';
import { GOLD_TOKEN_ABI } from './gold-token';

const TokenAddresses = {
  testnet: '0xcfa3915fE88fd9Fb8C7DaE54E8Ca59e6CaF06577'
};
const NetworkProvidersUrls = {
  testnet: 'http://89.40.14.180:8545'
};


@Component({
  selector: 'page-erc-721',
  templateUrl: 'erc-721.html'
})
export class Erc721Page {
  @ViewChild('coinsSlides') private coinsSlides: Slides;



  private TokenContractInfoMethods:any[] = [{
    method: 'name'
  }, {
    method: 'symbol'
  }, {
    method: '_purity',
    return: 'purity'
  }, {
    method: 'totalSupply'
  }, {
    method: '_maxSupplyTotal',
    return: 'maxSupplyTotal'
  }, {
    method: '_certifiedAssayer',
    return: 'certifiedAssayer'
  }];

  private forRepeatInfo:string[] = ['totalSupply'];

  private TokenInfoByIdMethods:any[] = [{
    method: 'originOf',
  }, {
    method: 'purchaseDateOf',
  }, {
    method: 'releaseDateOf'
  }, {
    method: 'releaseDateOf'
  }, {
    method: 'weightOf'
  }];

  private tokensCache = {
    BASE_INFO: {}
  };



  private wallet: any;
  private address: string;
  private web3: any;
  private goldABI: any;
  private tokenContract: any;
  public activeIndex: number = 0;

  public tokenInfo: any;

  constructor(
    private navParams: NavParams,
    private walletProvider: WalletProvider
  ) {
    this.wallet = this.navParams.data.wallet;
    this.goldABI = GOLD_TOKEN_ABI;
    this.web3 = new Web3();
    this.tokenInfo = {};

    const web3Provider = new Web3.providers.HttpProvider(NetworkProvidersUrls[this.wallet.network]);
    this.web3.setProvider(web3Provider);

    this.activeIndex = 0;

    this.walletProvider
      .getAddress(this.wallet, false)
      .then(addr => {
        this.address = addr;
        this.tokenContract = new this.web3.eth.Contract(this.goldABI);
        this.tokenContract.options.address = Web3.utils.toChecksumAddress(TokenAddresses[this.wallet.network]);
        this.getTokenInfo();
      });

  }


  ionViewDidLoad() {
    if (this.coinsSlides) {
      this.coinsSlides.ionSlideDidChange.subscribe((event) => {
        this.activeIndex = event.realIndex;
        this.getTokenInfo();
      });
    }
  }

  private callMethod(name, args = []) {
    return new Promise((resolve, reject) => {
      this.tokenContract.methods[name].apply(null, args).call((err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }


  private getTokenInfoByIndex() {
    const promises = [];
    this.callMethod('tokenOfOwnerByIndex', [this.address, this.activeIndex]).then((result:string) => {
      if (!this.tokensCache[result]) {
        this.tokensCache[result] = {};
        const cacheData = this.tokensCache[result];
        cacheData['tokenId'] = result;
        this.TokenInfoByIdMethods.forEach((oneMethod: any) => {
          promises.push(this.callMethod(oneMethod.method, [cacheData['tokenId']]).then((result) => {
            const key = oneMethod.return || oneMethod.method;
            cacheData[key] = result;
          }));
        });
        Promise.all(promises).then(() => {
          this.tokenInfo = cacheData;
        });
      } else {
        this.tokenInfo = this.tokensCache[result];
      }

    });
  }

  public goToReceive() {
    alert('Спроси Вадима! Он знает, где достать!!');
  }

  private getTokenInfo() {
    const baseContractInfo = this.tokensCache['BASE_INFO'];
    this.TokenContractInfoMethods.forEach((oneMethod: any) => {
      const key = oneMethod.return || oneMethod.method;
      if (baseContractInfo[key] && !this.forRepeatInfo.includes(key)) {
        return;
      }
      this.callMethod(oneMethod.method).then((result) => {
        baseContractInfo[key] = result;
      });
    });

    this.callMethod('balanceOf', [this.address]).then((result: string) => {
      const count = parseInt(result, 10);
      baseContractInfo['tokensCount'] = Array(count);
      if (count) {
        this.getTokenInfoByIndex();
      }
    }, () => {
      baseContractInfo['tokensCount'] = Array(0);
    });
  }
}
