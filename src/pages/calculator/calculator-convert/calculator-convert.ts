import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ErrorsProvider } from '../../../providers/errors/errors';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { TranslateService } from '@ngx-translate/core';
import { BwcErrorProvider, IncomingDataProvider, TxFormatProvider } from '../../../providers';
import { Logger } from '../../../providers/logger/logger';
import { calculator_api, coinInfo } from '../calculator-parameters';

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
    private txFormatProvider: TxFormatProvider
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

    if (type == 'send' && this.sendLength === 1) {
      wallets.map(res => {
        res.then(result => {
          this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput =
            result.address;
        });
      });
    }

    return walletsRes;
  }

  public changeAddress(type) {
    if (type == 'Get') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput = this.ConvertGroupForm.value.ConvertFormGroupAddressGet;
      this.setAddress(this.formCoins.get);
    }
    if (type == 'Send') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput = this.ConvertGroupForm.value.ConvertFormGroupAddressSend;
    }
  }

  public openAddressList(wallets, type?) {
    this.typeOpenAddressList = type;

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
      .post(calculator_api + 'exchange/', {
        to_address: address,
        to_currency: currency
      })
      .toPromise();
  }

  public goToSendPage() {
    const sendAddress = this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput;
    const getAddress = this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput;

    this.wallet = this.walletsInfoSend.find(infoWallet => {
      return (
        infoWallet.address === sendAddress
      );
    }).wallet;

    const addressView = this.walletProvider.getAddressView(
      this.wallet.coin,
      this.wallet.network,
      this.addresses[this.formCoins.send.toLowerCase() + '_address'],
      true
    );

    const parsedAmount = this.txFormatProvider.parseAmount(
      this.wallet.coin.toLowerCase(),
      this.formCoins.amountSend,
      this.wallet.coin.toUpperCase()
    );

    const redirParms = {
      activePage: 'ScanPage',
      walletId: this.wallet.id,
      amount: parsedAmount.amountSat
    };

    if (this.formCoins.send.toLowerCase() === 'duc' && this.formCoins.get.toLowerCase() === 'ducx') {
      this.checkTransitionLimitDucToDucx(getAddress, parseInt(parsedAmount.amount, 10))
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

  private checkTransitionLimitDucToDucx(getAddress, amountSend) {
    return this.httpClient
      .post(calculator_api + 'transfers/', {
        'address': getAddress
      })
      .toPromise()
      .then(res => {
        const DECIMALS = 1e8;
        const dailyAvailable = res['daily_available'] / DECIMALS;
        const weeklyAvailable = res['weekly_available'] / DECIMALS;
        if (dailyAvailable < amountSend) {
          throw new Error('Weekly DUCX swap limit is 1000 DUC. This day you can swap no more than ' + dailyAvailable + ' DUC.');
        } else if (weeklyAvailable < amountSend) {
          throw new Error('Weekly DUCX swap limit is 5000 DUC. This week you can swap no more than ' + weeklyAvailable + ' DUC.');
        } else {
          return;
        }
      })
  }
}
