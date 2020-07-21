import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { Logger, ProfileProvider, WalletProvider } from '../../providers';
import { VOUCHER_URL_REQUEST } from './params';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  public vouchersLoading = true;
  public vouchers = [];
  public keys = [];
  public walletsGroups: any;

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private httpClient: HttpClient
  ) {}

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

    this.getWalletsInfo('duc');
  }

  private getWalletsInfo(coin) {
    let coins = [];
    let wallets = [];
    let walletsRes = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    wallets = coins.map(wallet => {
      this.walletProvider.getAddress(wallet, false);
      return {
        keyId: wallet.keyId
      };
    });

    wallets.map(res => {
      if (!walletsRes.includes(res.keyId)) walletsRes.push(res.keyId);
    });

    this.httpClient
      .get(
        `${VOUCHER_URL_REQUEST}get_frozen_vouchers/?wallet_ids=${walletsRes}`
      )
      .toPromise()
      .then(result => {
        this.vouchers = result as any;
        this.logger.log('vouchers original:', this.vouchers);

        this.vouchers.map(x => {
          x.freez_date = new Date(x.lock_time * 1000);
          x.freez_date_count = Math.ceil(
            Math.abs(x.freez_date.getTime() - new Date().getTime()) /
              (1000 * 3600 * 24)
          );
          this.getVoucher(x.id).then(res => (x.info = res));
        });

        this.vouchersLoading = false;
        this.logger.log('vouchers:', this.vouchers);
      })
      .catch(err => this.logger.debug(err));
  }

  private getVoucher(id) {
    return this.httpClient
      .get(`${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`)
      .toPromise();
  }

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }
}
