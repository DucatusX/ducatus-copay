import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, NavParams } from 'ionic-angular';

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
  ]

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient
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

  public changeAddress(type) {
    if (type == 'Get') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressGetInput = this.addressesRandom[this.ConvertGroupForm.value.ConvertFormGroupAddressGet];
      // this.getAddresses();
    }
    if (type == 'Send') {
      this.ConvertGroupForm.value.ConvertFormGroupAddressSendInput = this.addressesRandom[this.ConvertGroupForm.value.ConvertFormGroupAddressSend];
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

  public goToSendPage() {
    this.navCtrl.push(CalculatorSendPage, {
      get: this.formCoins.get.name,
      send: this.formCoins.send
    });
  }
}

