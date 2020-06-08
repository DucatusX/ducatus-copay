import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { SendPage } from '../../../pages/send/send';
import { IncomingDataProvider } from '../../../providers';
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

  public wallet: any;

  constructor(
    // private navCtrl: NavController,
    // private events: Events,
    private navParams: NavParams,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient,
    private walletProvider: WalletProvider,
    private profileProvider: ProfileProvider,
    private incomingDataProvider: IncomingDataProvider,
    private navCtrl: NavController,
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
      ],
      ConvertFormGroupAddressGet: [
        ''
      ],
      ConvertFormGroupAddressSend: [
        ''
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
    let walletsSend = this.getWalletsInfo(this.formCoins.send);

    Promise.all([walletsGet, walletsSend]).then((results) => {
      this.walletsInfoGet = results[0];
      this.walletsInfoSend = results[1];
      this.walletsChecker = true;
    });
  }

  private getWalletsInfo(coin) {
    let coins = [];
    let wallets = [];
    let walletsRes = [];

    this.walletsGroups.forEach((keyID) => {
      coins = _.concat(coins, keyID.filter(wallet => wallet.coin === coin.toLowerCase()))
    });

    wallets = coins.map(wallet => {
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return { wallet, address };
      })
    });

    wallets.map(res => {
      res.then(result => { walletsRes.push(result) });
    });

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

  public setAddress(type) {
    const address = this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput;
    if (type === 'DUC') {
      if (address.length === 34 && ['L', 'l', 'M', 'm'].includes(address.substring(0, 1))) {

        this.getAddresses();
        // this.checkDucAddress(address).then((result) => {
        //   if (result) {
        //     this.logger.debug('address result', result);
        //     this.getAddresses();
        //   }
        // }).catch(err => { this.logger.debug('something went wrong...', err); })
      }
    }

    if (type === 'DUCX') {
      if (address.length === 42) {
        this.getAddresses();
      }
    }
  }

  public getAddresses() {
    this.getExchange(this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput, this.formCoins.get).then((result) => {
      this.logger.debug('got addresses:', result)
      this.addresses = result;
    }).catch(err => { this.logger.debug('cant get addresses: ', err) })
  }

  public getExchange(address: string, currency: string) {
    return this.httpClient.post(calculator_api + 'exchange/', {
      to_address: address,
      to_currency: currency
    }).toPromise();
  }

  public checkDucAddress(address: string) {
    return this.httpClient.post(calculator_api + 'validate_ducatus_address/', {
      to_address: address
    }).toPromise();
  }

  public goToSendPage() {

    let info = this.walletsInfoSend.map(infoWallet => { if (infoWallet.address === this.ConvertGroupForm.value.ConvertFormGroupAddressSend) return infoWallet.wallet; });

    const addressView = this.walletProvider.getAddressView(
      info[0].coin,
      info[0].network,
      this.addresses[this.formCoins.send.toLowerCase() + '_address']
    );
    this.wallet = info[0];

    const redirStringParams = 'ducatus:' + addressView + '?amount=' + this.formCoins.amountSend;
    const redirParms = {
      activePage: 'ScanPage',
      walletId: this.wallet.id
    };
    this.incomingDataProvider.redir(redirStringParams, redirParms);
  }
}

