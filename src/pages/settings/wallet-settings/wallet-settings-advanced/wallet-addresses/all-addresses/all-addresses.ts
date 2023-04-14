import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { OnGoingProcessProvider } from '../../../../../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../../../../../providers/platform/platform';

@Component({
  selector: 'page-all-addresses',
  templateUrl: 'all-addresses.html'
})
export class AllAddressesPage {
  public noBalance;
  public withBalance;
  public coin: string;
  public isCordova: boolean;
  public allAddresses;


  constructor(
    private navParams: NavParams,
    private viewCtrl: ViewController,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private platformProvider: PlatformProvider
  ) {
    this.noBalance = this.navParams.data.noBalance;
    this.withBalance = this.navParams.data.withBalance;
    this.coin = this.navParams.data.coin;
    this.allAddresses = this.noBalance.concat(this.withBalance);
    this.isCordova = this.platformProvider.isCordova;
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  public sendByEmail() {
    this.onGoingProcessProvider.set('sendingByEmail');
  }
}
