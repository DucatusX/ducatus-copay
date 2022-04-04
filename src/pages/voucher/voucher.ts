import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { ApiProvider, 
  Coin, 
  Logger, 
  ProfileProvider, 
  TxFormatProvider 
} from '../../providers';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})

export class VoucherPage {
  public vouchersLoading = true;
  public vouchers = [];
  public walletsGroups: any;
  public wallets: any;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient,
    private profileProvider: ProfileProvider,
    private apiProvider: ApiProvider,
    private logger: Logger,
    private formatProvider: TxFormatProvider
  ) {}

  ionViewWillEnter() {
    this.wallets = this.profileProvider.getWallets({ showHidden: true });
    this.getVouchers();
  }

  private getVouchers(): void {
    const walletsResult = this.getWalletsInfo(Coin.DUC);

    this.httpClient
      .get(
        this.apiProvider.getAddresses().deposit + `user/vouchers/list/?wallet_ids=${walletsResult}`
      )
      .toPromise()
      .then(result => {
        this.vouchers = result as any;
        this.vouchers.map( x => {
          x.ducAmount = this.formatProvider.satToUnit(x.ducAmount, Coin.DUC);
          x.withdrow_check = false;
        });
        this.vouchersLoading = false;
      });
  }

  public goToVoucehrAddPage(): void {
    this.navCtrl.push(VoucherAddPage);
  }

  private getWalletsInfo(coin: Coin): string[] {
    const walletsFiltered = this.wallets.filter( wallet => {
      return wallet.coin === coin.toLowerCase();
    });

    const walletsId: string[] = walletsFiltered.map( wallet => {
      return wallet.credentials.walletId;
    });

    return walletsId;
  }

  private showModal(type: string, id?: number, ducAmount?: number): void {
    const modalAnswers = {
      success: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `You will get ${ducAmount || ''} Ducatus in 15 minutes`,
        button: 'OK'
      },
      alreadyActivated: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Please wait, Ducatus is on the way to your wallet`,
        button: 'OK'
      },
      network: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something went wrong, try again',
        button: 'OK'
      }
    };

    const answers = modalAnswers[type]
      ? modalAnswers[type]
      : modalAnswers['network'];

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.vouchers.map(t => {
              this.getVouchers();
              if (t.id === id) t.withdrow_check = false;
            });
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  private debounceGetVouchers = _.debounce(
    async () => {
      this.getVouchers();
    },
    5000,
    {
      leading: true
    }
  );

  public doRefresh(refresher): void {
    this.debounceGetVouchers();
    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }

  private withdraw (wallet_id: number): Promise<object> {
    let url = this.apiProvider.getAddresses().deposit + `user/vouchers/${wallet_id}/withdraw/`;

    return this.httpClient
      .put(url, "")
      .toPromise();
  }

  public withdrowTrigger(id: number): void {
    this.withdraw(id)
    .then(
      res => {
        this.logger.debug(res);
        this.showModal('success', id, );
    })
    .catch(
      err => {
        this.logger.debug(err);
        this.showModal('network', id);
    });
  }
}