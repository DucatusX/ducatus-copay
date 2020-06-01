import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { NavController, NavParams } from 'ionic-angular';

import { coinInfo, convertCoins } from './calculator-parameters';

@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {

  public CalculatorGroup;
  public CalculatorGroupForm: FormGroup;
  public formCoins: any = [];
  public coinInfo: any = [];

  constructor(
    // private navCtrl: NavController,
    // private navParams: NavParams,
    private formBuilder: FormBuilder,
  ) {

    this.formCoins.get = convertCoins['DUC']; // DUC
    this.formCoins.send = this.formCoins.get.items[0]; // DUCX
    this.coinInfo = coinInfo;

    this.CalculatorGroupForm = this.formBuilder.group({
      CalculatorGroupSend: [
        '1',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      CalculatorGroupGet: [
        '0,1'
      ],
      CalculatorGroupGetCoin: [
        ''
      ],
      CalculatorGroupSendCoin: [
        ''
      ]
    });
  }

  public changeCoin(type) {
    if (type == 'Get') {
      this.formCoins.get = convertCoins[this.CalculatorGroupForm.value.CalculatorGroupGetCoin];
    }
  }
}
