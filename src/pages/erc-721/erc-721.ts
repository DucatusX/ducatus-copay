import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Slides } from 'ionic-angular';
import { WalletProvider } from '../../providers';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';

import Web3 from 'web3';
import { SendPage } from '../send/send';
import { GOLD_TOKEN_ABI } from './gold-token';

const TokenAddresses = {
  testnet: '0xcfa3915fE88fd9Fb8C7DaE54E8Ca59e6CaF06577',
  livenet: '0x90503468DB36aD503e1EDC7965C4d5123070EdAF'
};
const NetworkProvidersUrls = {
  testnet: 'http://89.40.14.180:8545/',
  livenet: 'http://195.181.242.115:8546/'
};

@Component({
  selector: 'page-erc-721',
  templateUrl: 'erc-721.html'
})
export class Erc721Page {
  @ViewChild('coinsSlides') private coinsSlides: Slides;

  private TokenContractInfoMethods: any[] = [
    {
      method: 'name'
    },
    {
      method: 'symbol'
    },
    {
      method: '_purity',
      return: 'purity'
    },
    {
      method: 'totalSupply'
    },
    {
      method: '_maxSupplyTotal',
      return: 'maxSupplyTotal'
    },
    {
      method: '_certifiedAssayer',
      return: 'certifiedAssayer'
    }
  ];

  private forRepeatInfo: string[] = ['totalSupply'];

  private TokenInfoByIdMethods: any[] = [
    {
      method: 'originOf'
    },
    {
      method: 'purchaseDateOf'
    },
    {
      method: 'releaseDateOf'
    },
    {
      method: 'releaseDateOf'
    },
    {
      method: 'weightOf'
    }
  ];

  private tokensCache = {
    BASE_INFO: {} as any
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
    private navCtrl: NavController,
    private walletProvider: WalletProvider,
    private externalLinkProvider: ExternalLinkProvider
  ) {
    this.wallet = this.navParams.data.wallet;
    this.goldABI = GOLD_TOKEN_ABI;
    this.web3 = new Web3();
    this.tokenInfo = {};

    const web3Provider = new Web3.providers.HttpProvider(
      NetworkProvidersUrls[this.wallet.network]
    );
    this.web3.setProvider(web3Provider);

    // this.web3.eth.sendSignedTransaction('0xf8c904848321560083020d0294cfa3915fe88fd9fb8c7dae54e8ca59e6caf0657780b86423b872dd000000000000000000000000a2a55ee6114383de7fc2ac72ca54bdbadc33ebc5000000000000000000000000656607abb0a80f0f7e5eeb692af982c86649d0a4000000000000000000000000000000000000000000000000000000000000000125a0b4147662c9eb1c0407d22b204f0ec4c837cca91bab0915cd3f1c621f970a3f76a074bee1dbd6bfc6fd889dad5ec8abbad389197264f547e15485b2c9109211ad33');
    this.activeIndex = 0;

    this.walletProvider.getAddress(this.wallet, false).then(addr => {
      this.address = addr;
      this.tokenContract = new this.web3.eth.Contract(this.goldABI);
      this.tokenContract.options.address = Web3.utils.toChecksumAddress(
        TokenAddresses[this.wallet.network]
      );
      // this.tokenContract.methods.tokenOfOwnerByIndex(addr, 1).call().then((a, b) => {
      //   console.log(a, b);
      // });

      this.getTokenInfo();
    });
  }

  ionViewDidLoad() {
    if (this.coinsSlides) {
      this.coinsSlides.ionSlideDidChange.subscribe(event => {
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
    this.callMethod('tokenOfOwnerByIndex', [
      this.address,
      this.activeIndex
    ]).then((result: string) => {
      if (!this.tokensCache[result]) {
        this.tokensCache[result] = {};
        const cacheData = this.tokensCache[result];
        cacheData['tokenId'] = result;
        this.TokenInfoByIdMethods.forEach((oneMethod: any) => {
          promises.push(
            this.callMethod(oneMethod.method, [cacheData['tokenId']]).then(
              result => {
                const key = oneMethod.return || oneMethod.method;
                cacheData[key] = result;
              }
            )
          );
        });
        Promise.all(promises).then(() => {
          this.tokenInfo = cacheData;
        });
      } else {
        this.tokenInfo = this.tokensCache[result];
      }
    });
  }

  ionViewWillLeave() {
    // this.tokenChecker.abort();
  }

  public goToReceive() {
    this.openExternalLink('https://d-pog.com');
  }

  public openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }

  private getTokenInfo() {
    const baseContractInfo = this.tokensCache['BASE_INFO'];
    this.tokensCache['BASE_INFO'].address = this.tokenContract.options.address;
    const allPromises = [];
    this.TokenContractInfoMethods.forEach((oneMethod: any) => {
      const key = oneMethod.return || oneMethod.method;
      if (baseContractInfo[key] && !this.forRepeatInfo.includes(key)) {
        return;
      }
      allPromises.push(
        this.callMethod(oneMethod.method).then(result => {
          baseContractInfo[key] = result;
        })
      );
    });

    allPromises.push(
      this.callMethod('balanceOf', [this.address]).then(
        (result: string) => {
          const count = parseInt(result, 10);
          baseContractInfo['tokensCount'] = Array(count);
          if (count) {
            this.getTokenInfoByIndex();
          }
        },
        () => {
          baseContractInfo['tokensCount'] = Array(0);
        }
      )
    );
  }

  public goToSendPage() {
    this.navCtrl.push(SendPage, {
      wallet: this.wallet,
      token: {
        type: 'erc721',
        base: this.tokensCache['BASE_INFO'],
        selected: this.tokenInfo
      }
    });
  }
}
