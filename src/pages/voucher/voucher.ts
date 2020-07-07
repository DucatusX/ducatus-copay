import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
// import { HttpClient } from '@angular/common/http';
// import { Logger } from '../../providers/logger/logger';

// import { MoonPayProvider } from '../../providers';

// import { CalculatorPage } from './../calculator/calculator';
import { VoucherAddPage } from './add/add';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  constructor(
    private navCtrl: NavController
  ) // private moonPayProvider: MoonPayProvider // private logger: Logger, // private httpClient: HttpClient
  {}

  ionViewWillEnter() {}

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }

  // public openMoonPay() {
  //   this.moonPayProvider.openMoonPay();
  // }

  // public openSwap() {
  //   this.navCtrl.push(CalculatorPage);
  // }
}
