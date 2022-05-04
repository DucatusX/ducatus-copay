import * as _ from 'lodash';
import env from '../../../environments';
import { AlertController, NavParams, Platform } from 'ionic-angular';
import {
  ActionSheetProvider,ApiProvider,
  BwcErrorProvider, Coin,
  ErrorsProvider, IncomingDataProvider,
  Logger, ProfileProvider,
  TxFormatProvider, WalletProvider
} from '../../../providers';
import { Component } from '@angular/core';
import { ICoinsInfo } from '../swap-parameters'; 
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'page-swap-convert',
  templateUrl: 'swap-convert.html'
})
export class SwapConvertPage {
  public formCoins: {
    getCoin: ICoinsInfo;
    sendCoin: ICoinsInfo;
    getAmount: string;
    sendAmount: string;
  } = {
    getCoin: undefined,
    sendCoin: undefined,
    getAmount: undefined,
    sendAmount: undefined
  };
  public walletsGroups: any[];
  public walletsChecker: boolean = false;
  public walletsInfoGet: any;
  public walletsInfoSend: any;
  public addresses: any;
  public typeOpenAddressList: any;
  public sendLength: number = 0;
  public sendDisabled: boolean;
  public sendFirstAddress: any;
  public sendAddress: string;
  public sendWallet: any;
  public getAddress: string;
  public getWallet: any;
  public wallet: any;
  public fullSize: boolean;
  public isProduction: boolean;

  constructor(
    private alertCtrl: AlertController,
    private actionSheetProvider: ActionSheetProvider,
    private apiProvider: ApiProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private errorsProvider: ErrorsProvider,
    private navParams: NavParams,
    private httpClient: HttpClient,
    private incomingDataProvider: IncomingDataProvider,
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private platform: Platform,
    private translate: TranslateService,
    private txFormatProvider: TxFormatProvider,
    private walletProvider: WalletProvider
  ) {
    if (this.platform.width() > 500) {
      this.fullSize = true;
    }

    const { name: mode } = env;
    this.formCoins.getCoin = this.navParams.data.getCoin;
    this.formCoins.sendCoin = this.navParams.data.sendCoin;
    this.formCoins.getAmount = this.navParams.data.getAmount;
    this.formCoins.sendAmount = this.navParams.data.sendAmount;
    this.isProduction = (mode === 'production');
  }

  public ionViewWillEnter(): void {
    this.setWallets();
  }

  private setWallets() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    const walletsGet = this.getWalletsInfo(this.formCoins.getCoin);
    const walletsSend = this.getWalletsInfo(this.formCoins.sendCoin, 'sendCoin');

    Promise
      .all([walletsGet, walletsSend])
      .then(results => {
        this.walletsInfoGet = results[0];
        this.walletsInfoSend = results[1];
        this.walletsChecker = true;
      });
  }

  private getWalletsInfo(coin: ICoinsInfo, type?: 'sendCoin'): any[] {
    let coins = [];
    let wallets = [];
    let walletsRes = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.symbol.toLowerCase())
      );
    });

    wallets = coins.map(wallet => {
      return this.walletProvider
        .getAddress(wallet, false)
        .then(address => {
          return { wallet, address };
        });
    });

    wallets.map(res => {
      res.then(result => {
        walletsRes.push(result);
      });

      if (type === 'sendCoin') {
        this.sendLength++;
      }
    });

    return walletsRes;
  }

  public openAddressListSend(wallets): void {
    wallets = wallets.filter(elemWallets => {
      const currency: Coin = 
        elemWallets && 
        elemWallets.wallet && 
        elemWallets.wallet.coin;

      const walletBalanceSat: number = 
        elemWallets && 
        elemWallets.wallet && 
        elemWallets.wallet.cachedStatus &&
        elemWallets.wallet.cachedStatus.availableBalanceSat;

      const walletBalanceUnit = Number(this.txFormatProvider.satToUnit(walletBalanceSat, currency));
      const amountSend = parseFloat(this.formCoins.sendAmount);

      if (walletBalanceUnit >= amountSend) {
        return true;
      } 
        
      return false;
    });

    if (wallets.length == 0) {
      this.viewWalletsError('You do not have suitable wallets');
    
      return;
    }

    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'convertor-address',
      { wallet: wallets }
    );
    
    infoSheet.present();
    
    infoSheet.onDidDismiss((option,item) => {
      this.sendWallet = item;
      this.sendAddress = option;
      this.getAddress = '';
    });
  }

  openAddressListGet(wallets): void {
    if (!this.sendAddress) {
      return;
    }

    wallets = wallets.filter( elemWallets => {
      if (elemWallets.wallet.network === this.sendWallet.wallet.network) {
        return true;
      } 

      return false;
    });

    if (wallets.length == 0) {
      this.viewWalletsError('You do not have suitable wallets');
      
      return;
    }

    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'convertor-address',
      { wallet: wallets }
    );
    infoSheet.present();
    infoSheet.onDidDismiss((option,item) => {
      this.getAddress = option;
      this.getWallet = item.wallet;
    });
  }

  private viewWalletsError(message: string): void {
    const alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
      buttons: [{ text: 'Ok' }],
      message
    });

    alert.present();
  }

  public initializationOfSend(): void {
    this.sendDisabled = true;
    this.setAddress(this.getWallet.coin.toUpperCase());
  }

  public setAddress(type: string): void {
    const address = this.getAddress;
    
    if (
      type === 'DUC' &&
      address.length === 34 &&
      ['L', 'l', 'M', 'm','n','N'].includes(address.substring(0, 1))
    ) {
      this.getAddresses();
    }
  
    if (type === 'DUCX') {
      if (address.length === 42) {
        this.getAddresses();
      }
    }

    if (type === 'WDUCX') {
      this.getAddresses();
    }
  }

  public getAddresses(): void {
    this.getExchange(
      this.getAddress,
      this.formCoins.getCoin.symbol
    )
      .then(result => {
        this.addresses = result;
        this.goToSendPage();
      })
      .catch(err => {
        this.sendDisabled = false;
        this.logger.debug('cant get addresses: ', err);
        const infoSheet = this.actionSheetProvider.createInfoSheet('cant-get-addresses');
        
        infoSheet.present();
      });
  }

  public getExchange(address: string, currency: string): Promise<object> {
    const network: string = this.sendWallet.wallet.network;
    const url: string = `${this.apiProvider.getAddresses().getExchange[network]}/api/v1/exchange/`;

    return this.httpClient
      .post<object>(
        url,
        {
          to_address: address,
          to_currency: currency
        }
      )
      .toPromise();
  }

  public async goToSendPage(): Promise<void> {
    const dataInfo = {};
    const getAddress = this.getAddress;
    const coin = this.formCoins.getCoin.symbol.toLowerCase();
    const isWDUCX = (this.formCoins.getCoin.symbol.toLowerCase() === 'wducx');
    this.wallet = this.sendWallet.wallet;

    if (isWDUCX) {
      const isBinanceAddress = await this.checkAddress(getAddress, 'Binance');
      
      if (!isBinanceAddress) {
        return;
      }

      dataInfo[coin] = await this.getDucxWduxSwapInfo();
    } else {
      const swapAddress = this.addresses[this.formCoins.sendCoin.symbol.toLowerCase() + '_address']
        || getAddress;

      dataInfo[coin] = { swap_address: swapAddress };
    }
    
    const dataAddress = dataInfo;

    if (isWDUCX) {
      dataAddress['wducx'] = dataInfo['wducx']
        .find(i => i.network === 'Ducatusx');
    }

    const addressView = this.walletProvider.getAddressView(
      this.wallet.coin,
      this.wallet.network,
      dataAddress[this.formCoins.getCoin.symbol.toLowerCase()].swap_address,
      true
    );

    const parsedAmount = this.txFormatProvider.parseAmount(
      this.wallet.coin.toLowerCase(),
      this.formCoins.sendAmount,
      this.wallet.coin.toUpperCase()
    );

    const redirParams: any = {
      activePage: 'ScanPage',
      walletId: this.wallet.id, 
      amount: Number(parsedAmount.amountSat).toLocaleString('fullwide', { useGrouping: false })
    };

    if (isWDUCX) {
      redirParams.tokenAddress = dataAddress['wducx'].swap_address;
      redirParams.wDucxAddress = getAddress;
    }

    const amount = parseInt(
      Number(parsedAmount.amount)
        .toLocaleString('fullwide', { useGrouping: false }), 
      10
    );
    const isDUCtoDUCX = (
      this.formCoins.sendCoin.symbol.toLowerCase() === 'duc' 
      && this.formCoins.getCoin.symbol.toLowerCase() === 'ducx'
    );
    const isDucxToWducx = (
      this.formCoins.sendCoin.symbol.toLowerCase() === 'ducx'
      && this.formCoins.getCoin.symbol.toLowerCase() === 'wducx'
    );

    if (isDUCtoDUCX) {
      this.checkTransitionLimitDucToDucx(getAddress, amount)
        .then(() => {
          this.sendDisabled = false;
          this.incomingDataProvider.redir(addressView, redirParams);
        })
        .catch(err => {
          const title = this.translate.instant('Swap limit');

          err = this.bwcErrorProvider.msg(err);
          this.errorsProvider.showDefaultError(err, title);
        });
    } else if (isDucxToWducx) {
      Promise.all([
        this.checkTransitionLimitDucxToWDucx(amount),
        this.checkMinimalSwapDucxToWducx(amount, dataInfo['wducx'].min_amount),
        this.checkMaxSwapDucxToWducx(amount, dataInfo['wducx'].max_amount)
      ])
        .then(() => {
          this.incomingDataProvider.redir(addressView, redirParams);
        })
        .catch(err => {
          const title = this.translate.instant('Swap limit');

          err = this.bwcErrorProvider.msg(err);
          this.errorsProvider.showDefaultError(err, title);
        });
    } else {
      this.incomingDataProvider.redir(addressView, redirParams);
    }
  }

  public checkAddress(address: string, coin: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let status = false;

      if (coin === 'Binance') {
        status = /^0x[a-fA-F0-9]{40}$/.test(address);
        
        if (status) {
          resolve(true);
        }
      }

      if (!status) {
        this.errorsProvider.showDefaultError(
          this.bwcErrorProvider.msg(`${coin} address is not valid`),
          this.translate.instant('Error')
        );
      }

      resolve(false);
    });
  }

  private async getDucxWduxSwapInfo(): Promise<any> {
    return this.httpClient
      .get(this.apiProvider.getAddresses().swap.network)
      .toPromise();
  }

  private checkTransitionLimitDucToDucx(getAddress: string, amountSend: number): Promise<void> {
    const network = this.sendWallet.wallet.network;
    const url = `${this.apiProvider.getAddresses().getExchange[network]}/api/v1/transfers/`;

    return this.httpClient
      .post(
        url,
        { address: getAddress }
      )
      .toPromise()
      .then(res => {
        const DECIMALS = 1e8;
        const dailyAvailable = res['daily_available'] / DECIMALS;
        const weeklyAvailable = res['weekly_available'] / DECIMALS;
        
        if (dailyAvailable < amountSend) {
          throw new Error(
            'Daily DUCX swap limit is 25000 DUC. This day you can swap no more than '
            + dailyAvailable
            + ' DUC.'
          );
        } else if (weeklyAvailable < amountSend) {
          throw new Error(
            'Weekly DUCX swap limit is 100000 DUC. This week you can swap no more than ' 
            + weeklyAvailable
            + ' DUC.'
          );
        } else {
          return;
        }
      });
  }

  private checkTransitionLimitDucxToWDucx(amountSend: number): Promise<void> {
    return this.httpClient
      .get(this.apiProvider.getAddresses().swap.bsc)
      .toPromise()
      .then(res => {
        if (res < amountSend) {
          throw new Error('Daily limit for swapping WDUCX is reached. Please try again tomorrow');
        } else {
          return;
        }
      })
      .catch(() => {
        throw new Error('Daily limit for swapping WDUCX is reached. Please try again tomorrow');
      });
  }
  

  private checkMaxSwapDucxToWducx(amountSend: number | string, maxAmount: number | string): Promise<void> {
    return new Promise<void>(resolve => {
      if (+maxAmount < +amountSend) {
        throw new Error(`Maximun swap limit is ${+maxAmount || 5000} DUCX`);
      }
      
      resolve();
    });
  }

  private checkMinimalSwapDucxToWducx(amountSend: number | string, minimalAmount: number | string): Promise<void> {
    return new Promise<void>(resolve => {
      if (+minimalAmount > +amountSend) {
        throw new Error('Minimal swap limit is 100 DUCX');
      } 

      resolve();
    });
  }
  
}