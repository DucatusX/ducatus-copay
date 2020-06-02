import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController } from 'ionic-angular';

import { CalculatorConvertPage } from './calculator-convert/calculator-convert';
import { coinInfo, convertCoins, convertGetCoins } from './calculator-parameters';

const fixNumber = x => ((x.toString().includes('.')) ? (x.toString().split('.').pop().length) : (0));

@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {

  public CalculatorGroupForm: FormGroup;
  public formCoins: any = [];
  public coin_info: any;
  public convertGetCoins: any;
  public lastChange: any;

  public rates: any = {
    DUC: {
      ETH: 0.00046189,
      BTC: 0.00001040,
      DUCX: 0.10000000
    },
    DUCX: {
      DUC: 10.00000000
    }
  };

  constructor(
    private navCtrl: NavController,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient
  ) {
    this.formCoins.get = convertCoins['DUC']; // DUC
    this.formCoins.send = this.formCoins.get.items[0]; // DUCX
    this.coin_info = coinInfo;
    this.convertGetCoins = convertGetCoins;

    this.CalculatorGroupForm = this.formBuilder.group({
      CalculatorGroupGet: [
        1,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupSend: [
        0.1,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupGetCoin: [
        this.formCoins.get.name,
      ],
      CalculatorGroupSendCoin: [
        this.formCoins.send
      ]
    });

    this.httpClient.get('https://www.ducatuscoins.com/api/v2/rates')
      .toPromise().then((result: { res_rates: any }) => {
        console.log('rates:', result);
      }, (err) => { console.log('get rates: ', err) });
  }

  public changeCoin(type) {
    if (type == 'Get') {
      this.formCoins.get = convertCoins[this.CalculatorGroupForm.value.CalculatorGroupGetCoin];
      this.formCoins.send = this.formCoins.get.items[0];
      this.CalculatorGroupForm.value.CalculatorGroupGetCoin = this.formCoins.get.name;
      this.CalculatorGroupForm.value.CalculatorGroupSendCoin = this.formCoins.send;
    }
    if (type == 'Send') {
      this.formCoins.send = this.CalculatorGroupForm.value.CalculatorGroupSendCoin;
    }

    this.changeAmount(this.lastChange);
  }

  public selectInputType(type) {
    this.lastChange = type;
  }

  public changeAmount(type) {
    const rate = this.rates[this.formCoins.get.name][this.formCoins.send];

    if (type === 'Get' && this.lastChange === 'Get') {
      const chNumber = this.CalculatorGroupForm.value.CalculatorGroupGet * rate;
      const fix = fixNumber(chNumber);
      this.CalculatorGroupForm.value.CalculatorGroupSend = fix === 0 ? chNumber : chNumber.toFixed(fix);
    }
    if (type === 'Send' && this.lastChange === 'Send') {
      const chNumber = this.CalculatorGroupForm.value.CalculatorGroupSend / rate;
      const fix = fixNumber(chNumber);
      this.CalculatorGroupForm.value.CalculatorGroupGet = fix === 0 ? chNumber : chNumber.toFixed(fix);
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
}
