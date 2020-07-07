import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
// import { HttpClient } from '@angular/common/http';
// import { Logger } from '../../providers/logger/logger';

import { VoucherAddPage } from './add/add';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  constructor(
    private navCtrl: NavController // private logger: Logger, // private httpClient: HttpClient
  ) {}

  ionViewWillEnter() {}

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }
}
