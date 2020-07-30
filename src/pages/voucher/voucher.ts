import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BwcProvider } from '../../providers/bwc/bwc';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import {
  IncomingDataProvider,
  KeyProvider,
  Logger,
  ProfileProvider,
  WalletProvider
} from '../../providers';
import { VOUCHER_URL_REQUEST } from './params';

// ************** freeze lib **************
// import * as bitcoin from 'bitcoinjs-lib';
// import * as bip65 from 'bip65';

// ************** freeze script **************
import * as freeze from './freeze.js';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  public vouchersLoading = true;
  public vouchers = [];
  public keys = [];
  public wallets: any;
  public walletsKey = [];
  public walletsGroups: any;
  public addressHardcode: string;

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private httpClient: HttpClient,
    private incomingDataProvider: IncomingDataProvider,
    private bwcProvider: BwcProvider,
    private keyProvider: KeyProvider
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

    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.keyId)) walletsResult.push(res.keyId);
      });

      this.httpClient
        .get(
          `${VOUCHER_URL_REQUEST}get_frozen_vouchers/?wallet_ids=${walletsResult}`
        )
        .toPromise()
        .then(result => {
          this.vouchers = result as any;
          this.logger.log('got user vouchers:', this.vouchers);

          this.vouchers.map(x => {
            x.freez_date = new Date(x.cltv_details.lock_time * 1000);
            x.freez_date_count = Math.ceil(
              Math.abs(x.freez_date.getTime() - new Date().getTime()) /
                (1000 * 3600 * 24)
            );
            x.withdrow_check = false;
          });

          this.vouchersLoading = false;
          this.logger.log('updated user vouchers:', this.vouchers);
        })
        .catch(err => this.logger.debug(err));
    });
  }

  private getAddress(wallet) {
    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        this.addressHardcode = addr;
        return resolve(addr);
      });
    });
  }

  private getWalletsInfo(coin): Promise<any> {
    return new Promise(resolve => {
      let coins = [];
      let wallets = [];

      this.walletsGroups.forEach(keyID => {
        coins = _.concat(
          coins,
          keyID.filter(wallet => wallet.coin === coin.toLowerCase())
        );
      });

      wallets = coins.map(wallet => {
        return {
          keyId: wallet.keyId,
          requestPubKey: wallet.credentials.requestPubKey,
          wallet,
          address: this.getAddress(wallet)
        };
      });

      resolve(wallets);
    });
  }

  private getVoucher(id) {
    return this.httpClient
      .get(`${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`)
      .toPromise();
  }

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }

  public withdrowTrigger(id: number) {
    // ************** fetch voucher by id **************

    this.getVoucher(id).then(res => {
      const voucher: any = res;

      // ************** configurate voucher cltv  **************
      /**
       * Data for freeze.js function makeFreeze(privateKey, params)
       *
       * @param sending_amount
       * @param tx_hash
       * @param user_duc_address
       * @param vout_number
       * @param redeem_script
       * @param lockTime
       *
       */

      voucher.cltv_details.sending_amount =
        voucher.voucherinput_set[0].amount - voucher.tx_fee;
      voucher.cltv_details.tx_hash = voucher.voucherinput_set[0].mint_tx_hash;
      voucher.cltv_details.user_duc_address = voucher.user_duc_address;
      voucher.cltv_details.vout_number = voucher.voucherinput_set[0].tx_vout;

      this.logger.log(
        'selected voucher with updated cltv_details data',
        voucher
      );

      // ************** get selected wallet by wallet address **************

      this.getWalletsInfo('duc').then(wallets => {
        wallets.map(res => {
          let uWallet: any;

          // ************** get wallet API **************

          res.address.then(async res1 => {
            if (res1 === voucher.cltv_details.user_duc_address) {
              uWallet = res.wallet;
              this.logger.log('user wallet:', uWallet);

              // ************** try to get selected wallet private key **************

              const pWallet = await this.walletProvider.normalizeJSON(uWallet);
              this.logger.log(
                'try to get private key via func normilizeJSON:',
                pWallet
              );

              // ************** try to get selected wallet password **************

              const password_1 = await this.walletProvider
                .prepare(uWallet)
                .then(ps => {
                  return ps;
                });
              this.logger.log(
                '1. try to get password via walletProvider func prepare',
                password_1
              );

              const password_2 = await this.keyProvider
                .handleEncryptedWallet(uWallet.credentials.keyId)
                .then((password: string) => {
                  return password;
                });
              this.logger.log(
                '2: try to get password 2 via keyProvider func handleEncryptedWallet',
                password_2
              );

              // ************** trigger freeze script **************
              /**
               * params
               *
               * @param privateKey
               * @param voucher.cltv_details
               */

              const privateKey =
                'TJYbxzCnVf4gyvCBTgAEjk9UhHG2wjTWTE8aoUCd9wwtipZZ53Xw';

              freeze.makeFreeze(privateKey, voucher.cltv_details);

              // ************** get selected wallet public key **************

              const walletPublicKey = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
                uWallet.credentials.xPubKey
              );
              this.logger.log('user wallet public key:', walletPublicKey);

              // ************** get selected wallet private key **************

              const walletPrivKey = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
                uWallet.credentials.requestPrivKey
              ); // need proceed xPrivKey

              this.logger.log(
                'wallet private key and that key wif format',
                walletPrivKey
              );

              // ************** open send page **************

              const addressView = this.walletProvider.getAddressView(
                uWallet.coin,
                uWallet.network,
                voucher.cltv_details.user_duc_address,
                true
              );

              // const parsedAmount = this.txFormatProvider.parseAmount(
              //   uWallet.coin.toLowerCase(),
              //   voucher.cltv_details.sending_amount,
              //   uWallet.coin.toUpperCase()
              // );

              const redirParms = {
                activePage: 'ScanPage',
                walletId: uWallet.id,
                amount: '1000000000' // amount via voucher or 0?
              };

              this.incomingDataProvider.redir(addressView, redirParms);
            }
          });
        });
      });
    });
  }
}
