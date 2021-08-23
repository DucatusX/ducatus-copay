import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from 'ionic-angular';
import { ApiProvider } from '../../providers/api/api';
import { Logger } from '../../providers/logger/logger';

// import { MoonPayProvider } from '../../providers';

// import { VoucherPage } from '../voucher/voucher';
import { CalculatorConvertPage } from './calculator-convert/calculator-convert';

import {
  coinInfo,
  convertCoins,
  convertGetCoins
} from './calculator-parameters';

const fixNumber = x =>
  x.toString().includes('.')
    ? x
        .toString()
        .split('.')
        .pop().length
    : 0;

@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {
  public CalculatorGroupForm: FormGroup;
  public formCoins: any = [];
  public coin_info: any;
  public convertGetCoins: any;
  public lastChange: any = 'Get';
  public isAvailableDucSwap: boolean = true;
  public isAvailableSwapWDUCXtoDUCX: boolean = true;
  public isAvailableSwap: boolean = true;

  public rates: any;

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private formBuilder: FormBuilder,
    private apiProvider: ApiProvider,
    private httpClient: HttpClient // private moonPayProvider: MoonPayProvider
  ) {
    this.formCoins.get = convertCoins['DUCX']; // DUCX
    this.formCoins.send = this.formCoins.get.items[0]; // DUC
    this.coin_info = coinInfo;
    this.convertGetCoins = convertGetCoins;

    this.CalculatorGroupForm = this.formBuilder.group({
      CalculatorGroupGet: [
        0,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupSend: [
        0,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupGetCoin: [this.formCoins.get.name],
      CalculatorGroupSendCoin: [this.formCoins.send]
    });
  }

  ionViewWillEnter() {
    this.rates = null;

    this.httpClient
      .get(this.apiProvider.getAddresses().ducatuscoins + '/api/v1/rates')
      .toPromise()
      .then(
        (result: { res_rates: any }) => {
          this.logger.debug('getting rates:', result);
          this.rates = {
            ...result,
            WDUCX: {
              DUCX: 1
            }
          };
        },
        err => {
          this.logger.debug('error in getting rates: ', err);
        }
      );

    this.httpClient
      .get(
        this.apiProvider.getAddresses().ducatuscoins +
          '/api/v1/exchange/status/'
      )
      .toPromise()
      .then((res: boolean) => {
        this.isAvailableDucSwap = res;

        if (
          this.formCoins.get.name === 'DUCX' &&
          this.formCoins.send === 'DUC'
        ) {
          this.isAvailableSwap = !this.isAvailableDucSwap ? false : true;
        } else {
          this.isAvailableSwap = true;
        }
      })
      .catch(() => {
        this.isAvailableDucSwap = false;
      });

    // WDUCX - DUXX

    this.httpClient
      .get(this.apiProvider.getAddresses().swap.status)
      .toPromise()
      .then((res: boolean) => {
        this.isAvailableSwapWDUCXtoDUCX = res;

        if (
          this.formCoins.get.name === 'WDUCX' &&
          this.formCoins.send === 'DUCX'
        ) {
          this.isAvailableSwap = !this.isAvailableSwapWDUCXtoDUCX
            ? false
            : true;
        } else {
          this.isAvailableSwap = true;
        }
      })
      .catch(() => {
        this.isAvailableSwapWDUCXtoDUCX = false;
      });
  }

  public changeCoin(type) {
    if (type === 'Get') {
      this.formCoins.get =
        convertCoins[this.CalculatorGroupForm.value.CalculatorGroupGetCoin];
      this.formCoins.send = this.formCoins.get.items[0];
      this.CalculatorGroupForm.value.CalculatorGroupGetCoin = this.formCoins.get.name;
    }
    if (type === 'Send') {
      if (
        this.CalculatorGroupForm.value.CalculatorGroupGetCoin ===
        this.CalculatorGroupForm.value.CalculatorGroupSendCoin
      ) {
        this.formCoins.get =
          convertCoins[this.CalculatorGroupForm.value.CalculatorGroupSendCoin];
        this.CalculatorGroupForm.value.CalculatorGroupGetCoin = this.formCoins.get.items[0];
      } else {
        this.formCoins.send = this.CalculatorGroupForm.value.CalculatorGroupSendCoin;
      }
    }

    this.changeAmount(this.lastChange);

    if (this.formCoins.get.name === 'DUCX' && this.formCoins.send === 'DUC') {
      this.isAvailableSwap = !this.isAvailableDucSwap ? false : true;
    } else {
      this.isAvailableSwap = true;
    }

    if (this.formCoins.get.name === 'WDUCX' && this.formCoins.send === 'DUCX') {
      this.isAvailableSwap = this.isAvailableSwapWDUCXtoDUCX;
    } else {
      this.isAvailableSwap = true;
    }
  }

  public selectInputType(type) {
    this.lastChange = type;
  }

  public changeAmount(type) {
    const rate = this.rates[this.formCoins.get.name][this.formCoins.send];

    this.CalculatorGroupForm.value.CalculatorGroupSendCoin = this.formCoins.send;

    if (type === 'Get' && this.lastChange === 'Get') {
      const chNumber = this.CalculatorGroupForm.value.CalculatorGroupGet * rate;
      const fix = fixNumber(chNumber);
      this.CalculatorGroupForm.value.CalculatorGroupSend =
        fix === 0 ? chNumber : chNumber.toFixed(fix);
    }
    if (type === 'Send' && this.lastChange === 'Send') {
      const chNumber =
        this.CalculatorGroupForm.value.CalculatorGroupSend / rate;
      const fix = fixNumber(chNumber);
      this.CalculatorGroupForm.value.CalculatorGroupGet =
        fix === 0 ? chNumber : chNumber.toFixed(fix);
    }
  }

  public goToConvertPage() {
    this.navCtrl.push(CalculatorConvertPage, {
      get: this.formCoins.get.name,
      send: this.formCoins.send,
      amountGet: this.CalculatorGroupForm.value.CalculatorGroupGet,
      amountSend: this.CalculatorGroupForm.value.CalculatorGroupSend
    });
  }

  // public openMoonPay() {
  //   this.moonPayProvider.openMoonPay();
  // }

  // public openVoucher() {
  //   this.navCtrl.push(VoucherPage);
  // }
}
