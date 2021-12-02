import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavParams, AlertController } from 'ionic-angular';
import * as _ from 'lodash';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ApiProvider } from '../../../providers/api/api';
import { ErrorsProvider } from '../../../providers/errors/errors';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { TranslateService } from '@ngx-translate/core';
import {
  BwcErrorProvider,
  IncomingDataProvider,
  TxFormatProvider
} from '../../../providers';
import { Logger } from '../../../providers/logger/logger';
import { coinInfo } from '../calculator-parameters';

@Component({
  selector: 'page-calculator-convert',
  templateUrl: 'calculator-convert.html'
})
export class CalculatorConvertPage {
  public ConvertGroupForm: FormGroup;
  public formCoins: any = [];
  public coinInfo = coinInfo;

  public walletsGroups: any[];
  public walletsChecker: boolean = false;
  public walletsInfoGet;
  public walletsInfoSend;
  public addresses: any;
  public typeOpenAddressList: any;
  public sendLength: number = 0;
  public sendFirstAddress: any;

  public wallet: any;

  constructor(
    private navParams: NavParams,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient,
    private bwcErrorProvider: BwcErrorProvider,
    private errorsProvider: ErrorsProvider,
    private translate: TranslateService,
    private walletProvider: WalletProvider,
    private profileProvider: ProfileProvider,
    private incomingDataProvider: IncomingDataProvider,
    private logger: Logger,
    private actionSheetProvider: ActionSheetProvider,
    private txFormatProvider: TxFormatProvider,
    private apiProvider: ApiProvider,
    private alertCtrl: AlertController
  ) {
    this.formCoins.get = this.navParams.data.get;
    this.formCoins.send = this.navParams.data.send;
    this.formCoins.amountGet = this.navParams.data.amountGet;
    this.formCoins.amountSend = this.navParams.data.amountSend;

    this.ConvertGroupForm = this.formBuilder.group({
      ConvertFormGroupAddressGetInput: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      ConvertFormGroupAddressSendInput: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  getLastKnownBalance(wallet, currency) {
    return (
      wallet.lastKnownBalance &&
      wallet.lastKnownBalance.replace(` ${currency}`, '')
    );
  }

  getBalance(wallet, currency) {
    const lastKnownBalance = this.getLastKnownBalance(wallet, currency);
    if (currency === 'XRP') {
      const availableBalanceStr =
        wallet.cachedStatus &&
        wallet.cachedStatus.availableBalanceStr &&
        wallet.cachedStatus.availableBalanceStr.replace(` ${currency}`, '');
      return availableBalanceStr || lastKnownBalance;
    } else {
      const totalBalanceStr =
        wallet.cachedStatus &&
        wallet.cachedStatus.totalBalanceStr &&
        wallet.cachedStatus.totalBalanceStr.replace(` ${currency}`, '');
      return totalBalanceStr || lastKnownBalance;
    }
  }

  ballanceStrToNumber(balance:string):number {
    if(balance){
      //ToValidStrDecimal
      balance.replace(/[\s.,%]/g, '')
      //toNumber
      let balanceNum = parseFloat(balance);
      return balanceNum;
    }
    else return 0
  }

  ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    let walletsGet = this.getWalletsInfo(this.formCoins.get);
    let walletsSend = this.getWalletsInfo(this.formCoins.send, 'send');

    Promise.all([walletsGet, walletsSend]).then(results => {
      this.walletsInfoGet = results[0];
      this.walletsInfoSend = results[1];
      this.walletsChecker = true;
    });
  }

  private getWalletsInfo(coin, type?) {
    let coins = [];
    let wallets = [];
    let walletsRes = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    wallets = coins.map(wallet => {
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return { wallet, address };
      });
    });

    wallets.map(res => {
      res.then(result => {
        walletsRes.push(result);
      });
      if (type == 'send') this.sendLength++;
    });

   //autosubstitution sendAddressInput
    // if (type == 'send' && this.sendLength === 1) {
    //   wallets.map(res => {
    //     res.then(result => {
    //       this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput =
    //         result.address;
    //     });
    //   });
    // }

    return walletsRes;
  }

  public changeAddress(type) {
    if (type == 'Get') {
      // this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput = this.ConvertGroupForm.value.ConvertFormGroupAddressGet;
      this.setAddress(this.formCoins.get);
    }
    if (type == 'Send') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput = this.ConvertGroupForm.value.ConvertFormGroupAddressSend;
    }
  }

  private viewWalletsError(message: string): void {
    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title:
        '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
      message,
      buttons: [
        {
          text: 'Ok'
        }
      ]
    });
    alert.present();
  }

  public openAddressList(wallets, type?) {
    this.typeOpenAddressList = type;

    if (type === 'Send') {
      wallets = wallets.filter(elemWallets => {
        let currency = elemWallets && elemWallets.wallet && elemWallets.wallet.coin.toUpperCase();
        let walletBalance  = this.getBalance(elemWallets.wallet, currency);
        walletBalance = this.ballanceStrToNumber(walletBalance);
        let amountSend = parseFloat(this.formCoins.amountSend);

        if (walletBalance >= amountSend) {
          return true;
        } else if (Number.isNaN(walletBalance)) {
          return false;
        } else {
          return false;
        }
      });
    }

    if(wallets.length == 0)
    {
      this.viewWalletsError('You do not have suitable wallets');
      return;
    }

    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'convertor-address',
      { wallet: wallets }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        if (type == 'Get') {
          this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput = option;
          this.setAddress(this.formCoins.get);
        }
        if (type == 'Send') {
          this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput = option;
        }
      }
    });
  }

  public setAddress(type) {
    const address = this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput;
    if (type === 'DUC') {
      if (
        address.length === 34 &&
        ['L', 'l', 'M', 'm'].includes(address.substring(0, 1))
      ) {
        this.getAddresses();
      }
    }

    if (type === 'DUCX') {
      if (address.length === 42) {
        this.getAddresses();
      }
    }
    if (type === 'WDUCX') this.getAddresses();
  }

  public getAddresses() {
    this.getExchange(
      this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput,
      this.formCoins.get
    )
      .then(result => {
        this.addresses = result;
      })
      .catch(err => {
        this.logger.debug('cant get addresses: ', err);
      });
  }

  public getExchange(address: string, currency: string) {
    return this.httpClient
      .post(
        this.apiProvider.getAddresses().ducatuscoins + '/api/v1/exchange/',
        {
          to_address: address,
          to_currency: currency
        }
      )
      .toPromise();
  }

  public checkAddress(address: string, coin: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let status = false;

      if (coin === 'Binance') {
        status = /^0x[a-fA-F0-9]{40}$/.test(address);
        if (status) resolve(true);
      }

      if (!status)
        this.errorsProvider.showDefaultError(
          this.bwcErrorProvider.msg(`${coin} address is not valid`),
          this.translate.instant('Error')
        );

      resolve(false);
    });
  }

  public async goToSendPage() {
    const dataInfo = {};

    const sendAddress = this.ConvertGroupForm.value
      .ConvertFormGroupAddressSendInput;
    const getAddress = this.ConvertGroupForm.value
      .ConvertFormGroupAddressGetInput as string;

    // Validate addresses
    if (this.formCoins.get.toLowerCase() === 'wducx') {
      const cha = await this.checkAddress(getAddress, 'Binance');
      if (!cha) return;
    }

    this.wallet = this.walletsInfoSend.find(infoWallet => {
      return infoWallet.address === sendAddress;
    }).wallet;

    // Getting all data

    dataInfo[this.formCoins.get.toLowerCase()] =
      this.formCoins.get.toLowerCase() === 'wducx'
        ? await this.getDucxWduxSwapInfo()
        : {
            swap_address:
              this.addresses[this.formCoins.send.toLowerCase() + '_address'] ||
              getAddress
          };

    // console.log('data ADDRESS', dataInfo);
    // Getting addresses from all data
    const dataAddress = dataInfo;

    if (this.formCoins.get.toLowerCase() === 'wducx') {
      dataAddress['wducx'] = dataInfo['wducx'].find(
        i => i.network === 'Ducatusx'
      );
    }

    // ! ATTENTION
    // * dataAddress Must have swap_address parameter
    // * ex: dataAddress['YOUR_COIN'].swap_address

    this.logger.log('dataInfo:', dataInfo, dataAddress);

    // const address = dataAddress[this.formCoins.get.toLowerCase()].swap_address;
    this.formCoins.get.toLowerCase() === 'wdux'
      ? dataInfo['wdux'].find(i => i.network === 'DucatusX').swap_address
      : this.addresses[this.formCoins.send.toLowerCase() + '_address'] ||
        getAddress;

    const addressView = this.walletProvider.getAddressView(
      this.wallet.coin,
      this.wallet.network,
      dataAddress[this.formCoins.get.toLowerCase()].swap_address,
      true
    );

    this.logger.log('dataInfo:', dataInfo, dataAddress, addressView);

    // ! ATTENTION
    // * parsedAmount - created for only WDUCX
    // * because if you send more than 999 DUCX
    // * it will show 0 in send
    // * so we need to validate send coins and pass
    // * an real value which we recieve from previus page

    // this.formCoins.get.toLowerCase() === 'wducx'
    //   ? this.formCoins.amountSend
    //   :

    const parsedAmount = this.txFormatProvider.parseAmount(
      this.wallet.coin.toLowerCase(),
      this.formCoins.amountSend,
      this.wallet.coin.toUpperCase()
    );

    const redirParms: any = {
      activePage: 'ScanPage',
      walletId: this.wallet.id, 
      amount: Number(parsedAmount.amountSat).toLocaleString('fullwide', { useGrouping: false })
    };

    if (this.formCoins.get === 'WDUCX') {
      // redirParms.tokenAddress = this.apiProvider.getAddresses().swap.address;
      redirParms.tokenAddress = dataAddress['wducx'].swap_address;
      redirParms.wDucxAddress = getAddress;
    }

    if (
      this.formCoins.send.toLowerCase() === 'duc' &&
      this.formCoins.get.toLowerCase() === 'ducx'
    ) {
      this.checkTransitionLimitDucToDucx(
        getAddress,
        parseInt(Number(parsedAmount.amount).toLocaleString('fullwide', { useGrouping: false }), 10)
      )
        .then(() => {
          this.incomingDataProvider.redir(addressView, redirParms);
        })
        .catch(err => {
          const title = this.translate.instant('Swap limit');
          err = this.bwcErrorProvider.msg(err);
          this.errorsProvider.showDefaultError(err, title);
        });
    } else if (
      this.formCoins.send.toLowerCase() === 'ducx' &&
      this.formCoins.get.toLowerCase() === 'wducx'
    ) {
      Promise.all([
        this.checkTransitionLimitDucxToWDucx(parseInt(Number(parsedAmount.amount).toLocaleString('fullwide', { useGrouping: false }), 10)),
        this.checkMinimalSwapDucxToWducx(
          parseInt(Number(parsedAmount.amount).toLocaleString('fullwide', { useGrouping: false }), 10),
          dataInfo['wducx'].min_amount
        ),
        this.checkMaxSwapDucxToWducx(
          parseInt(Number(parsedAmount.amount).toLocaleString('fullwide', { useGrouping: false }), 10),
          dataInfo['wducx'].max_amount
        )
      ])
        .then(() => {
          this.incomingDataProvider.redir(addressView, redirParms);
        })
        .catch(err => {
          const title = this.translate.instant('Swap limit');
          err = this.bwcErrorProvider.msg(err);
          this.errorsProvider.showDefaultError(err, title);
        });
    } else {
      this.incomingDataProvider.redir(addressView, redirParms);
    }
  }

  private async getDucxWduxSwapInfo(): Promise<any> {
    return this.httpClient
      .get(this.apiProvider.getAddresses().swap.network)
      .toPromise();
  }

  private checkMaxSwapDucxToWducx(amountSend, maxAmount): Promise<any> {
    return new Promise<void>(resolve => {
      // console.log('MAX', maxAmount, amountSend);
      if (+maxAmount < +amountSend) {
        throw new Error(`Maximun swap limit is ${+maxAmount || 5000} DUCX`);
        // reject('Minimal swap limit is 100 DUCX');
      } else {
        resolve();
      }
    });

    // return this.httpClient
    //   .get(this.apiProvider.getAddresses().swap.network)
    //   .toPromise()
    //   .then(res => {
    //     if (res[0].min_amount > amountSend) {
    //       throw new Error('Minimal swap limit is 100 DUCX');
    //     } else {
    //       return;
    //     }
    //   })
    //   .catch(() => {
    //     throw new Error('Minimal swap limit is 100 DUCX');
    //   });
  }
  private checkMinimalSwapDucxToWducx(amountSend, minimalAmount): Promise<any> {
    return new Promise<void>(resolve => {
      if (+minimalAmount > +amountSend) {
        throw new Error('Minimal swap limit is 100 DUCX');
        // reject('Minimal swap limit is 100 DUCX');
      } else {
        resolve();
      }
    });

    // return this.httpClient
    //   .get(this.apiProvider.getAddresses().swap.network)
    //   .toPromise()
    //   .then(res => {
    //     if (res[0].min_amount > amountSend) {
    //       throw new Error('Minimal swap limit is 100 DUCX');
    //     } else {
    //       return;
    //     }
    //   })
    //   .catch(() => {
    //     throw new Error('Minimal swap limit is 100 DUCX');
    //   });
  }

  private checkTransitionLimitDucxToWDucx(amountSend) {
    return this.httpClient
      .get(this.apiProvider.getAddresses().swap.bsc)
      .toPromise()
      .then(res => {
        if (res < amountSend) {
          throw new Error(
            'Daily limit for swapping WDUCX is reached. Please try again tomorrow '
          );
        } else {
          return;
        }
      })
      .catch(() => {
        throw new Error(
          'Daily limit for swapping WDUCX is reached. Please try again tomorrow '
        );
      });
  }

  private checkTransitionLimitDucToDucx(getAddress, amountSend) {
    return this.httpClient
      .post(
        this.apiProvider.getAddresses().ducatuscoins + '/api/v1/transfers/',
        {
          address: getAddress
        }
      )
      .toPromise()
      .then(res => {
        const DECIMALS = 1e8;
        const dailyAvailable = res['daily_available'] / DECIMALS;
        const weeklyAvailable = res['weekly_available'] / DECIMALS;
        if (dailyAvailable < amountSend) {
          throw new Error(
            'Daily DUCX swap limit is 25000 DUC. This day you can swap no more than ' +
              dailyAvailable +
              ' DUC.'
          );
        } else if (weeklyAvailable < amountSend) {
          throw new Error(
            'Weekly DUCX swap limit is 100000 DUC. This week you can swap no more than ' +
              weeklyAvailable +
              ' DUC.'
          );
        } else {
          return;
        }
      });
  }
}