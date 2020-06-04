import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { coinInfo } from '../calculator-parameters';
import { CalculatorSendPage } from '../calculator-send/calculator-send';

@Component({
  selector: 'page-calculator-convert',
  templateUrl: 'calculator-convert.html'
})
export class CalculatorConvertPage {

  public ConvertGroupForm: FormGroup;
  public formCoins: any = [];
  public coinInfo = coinInfo;
  private addressesRandom = [
    '0x50CA353D42312f412C833a4a3FdfB594daC61FA3',
    '0xeb70207E8e28003f442aaCA0C165C0c25F02D6ce',
    '0x0110d4825E4a13e814210332d48d22616C6Fa18F',
    '0xcFf3077DcAaCAc7AA390c4dD3dC6b6BAF55f33fD'
  ];
  public walletsGroups: any[];
  public walletsGet;
  public wallets;

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient,
    private walletProvider: WalletProvider,
    private profileProvider: ProfileProvider
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

    let coinswallet = [];
    this.walletsGroups.forEach((keyID) => {
      coinswallet = _.concat(coinswallet, keyID.filter(wallet => wallet.coin === this.formCoins.get.toLowerCase()))
    });

    this.walletsGet = coinswallet.map(wallet => {
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return {
          wallet,
          address
        };
      }).catch(err => {
        console.log(err);
      });
    });


    Promise.all(this.walletsGet).then((result) => {
      this.wallets = result.filter(res => res);
      console.log(this.wallets);
    });


  }


  public changeAddress(type) {
    if (type == 'Get') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput = this.addressesRandom[this.ConvertGroupForm.value.ConvertFormGroupAddressGet];
      this.setAddress(this.formCoins.get);
    }
    if (type == 'Send') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput = this.addressesRandom[this.ConvertGroupForm.value.ConvertFormGroupAddressSend];
    }
  }

  public setAddress(type) {
    const address = this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput;
    if (type === 'DUC') {
      if (address.length === 34 && ['L', 'l', 'M', 'm'].includes(address.substring(0, 1))) {
        this.checkDucAddress(address).then((result) => {
          if (result) {
            this.getAddresses();
            console.log('address result', result);
          }
        }).catch(err => { console.log('something went wrong...', err); })
      }
    }

    if (type === 'DUCX') {
      if (address.length === 42) {
        const reg = /0x[0-9a-fA-F]{40}/;
        if (!reg.test(address)) { return; }
        // if (($.trim(address) == '') || ($.trim(address).length < 15)) { return; }
        else { this.getAddresses(); }
      }
    }
  }

  public getAddresses() {
    this.getExchange(this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput, this.formCoins.get).then((result) => {
      console.log('got addresses:', result)
    }).catch(err => { console.log('cant get addresses: ', err) })
  }

  public getExchange(address: string, currency: string) {
    return this.httpClient.post(`exchange/`, {
      to_address: address,
      to_currency: currency
    }).toPromise();
  }

  public checkDucAddress(address: string) {
    return this.httpClient.post(`exchange/`, {
      to_address: address
    }).toPromise();
  }

  public goToSendPage() {
    this.navCtrl.push(CalculatorSendPage, {
      get: this.formCoins.get.name,
      send: this.formCoins.send
    });
  }
}

