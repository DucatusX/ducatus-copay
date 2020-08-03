import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BwcProvider } from '../../providers/bwc/bwc';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { Logger, ProfileProvider, WalletProvider } from '../../providers';
import { VOUCHER_URL_REQUEST } from './params';

// ************** freeze lib **************
import * as bip65 from 'bip65';
import * as bitcoin from 'bitcoinjs-lib';

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
    private bwcProvider: BwcProvider
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

  private sendTX(raw_tx_hex) {
    return this.httpClient
      .post(`${VOUCHER_URL_REQUEST}send_raw_transaction/`, {
        raw_tx_hex
      })
      .toPromise();
  }

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }

  private async signFreeze(wallet: any, data: any) {
    this.logger.log('sign: wallet', wallet);
    this.logger.log('sign: data', data);

    const hashType = bitcoin.Transaction.SIGHASH_ALL;

    const network = bitcoin.networks.bitcoin;
    network.bip32.private = 0x019d9cfe;
    network.bip32.public = 0x019da462;
    network.pubKeyHash = 0x31;
    network.scriptHash = 0x33;
    network.wif = 0xb1;

    var lockTime = bip65.encode({ utc: data.lock_time });
    this.logger.log('sign: lockTime', lockTime);

    const txb = new bitcoin.TransactionBuilder(network);
    txb.setVersion(1);
    txb.setLockTime(lockTime);
    txb.addInput(data.tx_hash, data.vout_number, 0xfffffffe);
    txb.addOutput(data.user_duc_address, data.sending_amount);

    const tx = txb.buildIncomplete();

    const privateWifKey = await this.walletProvider
      .getKeys(wallet)
      .then(keys => {
        return this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
          keys.xPrivKey
        ).privateKey.toWIF();
      })
      .catch(err => {
        if (
          err &&
          err.message != 'FINGERPRINT_CANCELLED' &&
          err.message != 'PASSWORD_CANCELLED'
        ) {
          err.message == 'WRONG_PASSWORD'
            ? this.logger.error(
                'sign: walletProvider getKeys error WRONG_PASSWORD',
                err
              )
            : this.logger.error('sign: walletProvider getKeys error', err);
        }
      });
    this.logger.log('privateWifKey', privateWifKey);

    const signatureHash = tx.hashForSignature(
      0,
      Buffer.from(data.redeem_script, 'hex'),
      hashType
    );

    const keyPairAlice0 = bitcoin.ECPair.fromWIF(privateWifKey, network);

    const inputScriptFirstBranch = bitcoin.payments.p2sh({
      redeem: {
        input: bitcoin.script.compile([
          bitcoin.script.signature.encode(
            keyPairAlice0.sign(signatureHash),
            hashType
          ),
          bitcoin.opcodes.OP_TRUE
        ]),
        output: Buffer.from(data.redeem_script, 'hex')
      }
    }).input;

    tx.setInputScript(0, inputScriptFirstBranch);
    return tx.toHex();
  }

  public withdrowTrigger(id: number) {
    // ************** fetch voucher by id **************

    this.getVoucher(id).then(res => {
      const voucher: any = res;

      // ************** configurate voucher cltv  **************
      /**
       * @param sending_amount
       * @param tx_hash
       * @param user_duc_address
       * @param vout_number
       * @param redeem_script
       * @param lock_time
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

              // ************** trigger freeze script **************

              const txHex = await this.signFreeze(
                uWallet,
                voucher.cltv_details
              );

              this.logger.log('freeze transaction hex', txHex);

              this.sendTX(txHex)
                .then(res => {
                  this.logger.log('transaction sended', res);
                })
                .catch(err => {
                  this.logger.error('transaction not sended', err);
                });
            }
          });
        });
      });
    });
  }
}
