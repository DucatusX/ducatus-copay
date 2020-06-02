import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { NavController, NavParams } from 'ionic-angular';

import { coinInfo, convertCoins, convertGetCoins } from './calculator-parameters';

@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {

  public CalculatorGroupForm: FormGroup;
  public formCoins: any = [];
  public coin_info: any;
  public convertGetCoins: any;
  public lastChange = 'Get';

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
    // private navCtrl: NavController,
    // private navParams: NavParams,
    private formBuilder: FormBuilder,
  ) {

    this.formCoins.get = convertCoins['DUC']; // DUC
    this.formCoins.send = this.formCoins.get.items[0]; // DUCX
    this.coin_info = coinInfo;
    this.convertGetCoins = convertGetCoins;

    this.CalculatorGroupForm = this.formBuilder.group({
      CalculatorGroupGet: [
        '1',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupSend: [
        '0,1',
        Validators.compose([Validators.minLength(3), Validators.required])
      ],
      CalculatorGroupGetCoin: [
        this.formCoins.get.name,
      ],
      CalculatorGroupSendCoin: [
        this.formCoins.send
      ]
    });
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

    this.changeAmount(this.lastChange, true);
  }

  public changeAmount(type, change?) {

    console.log(this.lastChange)

    if (!change) {
      this.lastChange = type;
    }

    if (type == 'Get') {
      this.CalculatorGroupForm.value.CalculatorGroupSend = this.CalculatorGroupForm.value.CalculatorGroupGet * this.rates[this.formCoins.get.name][this.formCoins.send];
    }
    if (type == 'Send') {
      this.CalculatorGroupForm.value.CalculatorGroupGet = this.CalculatorGroupForm.value.CalculatorGroupSend / this.rates[this.formCoins.get.name][this.formCoins.send];
    }
  }
}
