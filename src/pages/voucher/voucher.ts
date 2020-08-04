import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { BwcProvider } from '../../providers/bwc/bwc';
import { VoucherAddPage } from './add/add';

import * as bip65 from 'bip65';
import * as bitcoin from 'bitcoinjs-lib';
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
  public walletsGroups: any;

  constructor(
    private logger: Logger,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient,
    private bwcProvider: BwcProvider,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider
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

    this.getVouchers();
  }

  private getVouchers() {
    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.keyId)) walletsResult.push(res.keyId);
      });

      this.logger.log(
        'get_frozen_vouchers/?wallet_ids=',
        `${VOUCHER_URL_REQUEST}get_frozen_vouchers/?wallet_ids=${walletsResult}`
      );

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

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }

  private getAddress(wallet) {
    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        return resolve(addr);
      });
    });
  }

  private getVoucher(id) {
    this.logger.log(
      'get_withdraw_info/?voucher_id=',
      `${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`
    );
    return this.httpClient
      .get(`${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`)
      .toPromise();
  }

  private sendTX(raw_tx_hex) {
    this.logger.log(
      'send_raw_transaction/',
      `${VOUCHER_URL_REQUEST}send_raw_transaction/${raw_tx_hex}`
    );
    return this.httpClient
      .post(`${VOUCHER_URL_REQUEST}send_raw_transaction/`, {
        raw_tx_hex
      })
      .toPromise();
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

  private async signFreeze(wallet: any, data: any) {
    const network = bitcoin.networks.bitcoin;
    network.bip32.private = 0x019d9cfe;
    network.bip32.public = 0x019da462;
    network.pubKeyHash = 0x31;
    network.scriptHash = 0x33;
    network.wif = 0xb1;

    const hashType = bitcoin.Transaction.SIGHASH_ALL;
    var lockTime = bip65.encode({ utc: data.lock_time });

    const txb = new bitcoin.TransactionBuilder(network);
    txb.setVersion(1);
    txb.setLockTime(lockTime);
    txb.addInput(data.tx_hash, data.vout_number, 0xfffffffe);
    txb.addOutput(data.user_duc_address, data.sending_amount);

    const tx = txb.buildIncomplete();

    const privateWifKey = await this.walletProvider
      .getKeys(wallet)
      .then(async keys => {
        const xPrivKey = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
          keys.xPrivKey
        );

        const derivedPrivKey = xPrivKey.deriveNonCompliantChild(
          wallet.credentials.rootPath
        );

        const xpriv = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
          derivedPrivKey
        );

        const address = await this.walletProvider
          .getMainAddresses(wallet, { doNotVerify: false })
          .then(result => {
            return result.find(t => {
              return t.address === data.user_duc_address;
            });
          });

        return xpriv.deriveChild(address.path).privateKey.toWIF();
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

    const inputScriptFirstBranch = bitcoin.payments.p2sh({
      redeem: {
        input: bitcoin.script.compile([
          bitcoin.script.signature.encode(
            bitcoin.ECPair.fromWIF(privateWifKey, network).sign(signatureHash),
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

  private showModal(type: string, id?: number) {
    const modalAnswers = {
      success: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your voucher successfully unfreeze`,
        button: 'OK'
      },
      alreadyActivated: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your voucher successfully unfreeze`,
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
      ]
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

  public withdrowTrigger(id: number) {
    this.vouchers.map(t => {
      if (t.id === id) t.withdrow_check = true;
    });

    this.getVoucher(id).then(res => {
      const voucher: any = res;

      voucher.cltv_details.sending_amount =
        voucher.voucherinput_set[0].amount - voucher.tx_fee;
      voucher.cltv_details.tx_hash = voucher.voucherinput_set[0].mint_tx_hash;
      voucher.cltv_details.user_duc_address = voucher.user_duc_address;
      voucher.cltv_details.vout_number = voucher.voucherinput_set[0].tx_vout;

      this.getWalletsInfo('duc').then(wallet => {
        wallet.map((wallet: any) => {
          wallet.address.then(async (address: string) => {
            if (address === voucher.cltv_details.user_duc_address) {
              const txHex = await this.signFreeze(
                wallet.wallet,
                voucher.cltv_details
              );

              this.logger.log('freeze transaction hex', txHex);

              this.sendTX(txHex)
                .then(res => {
                  this.logger.log('transaction sended', res);
                  this.showModal('success', id);
                })
                .catch(err => {
                  if (
                    err.error.detail ===
                    '-27: transaction already in block chain'
                  )
                    this.showModal('alreadyActivated', id);
                  this.showModal('network', id);
                  this.logger.error('transaction not sended', err);
                  this.logger.error('transaction not sended', err.error.detail);
                });
            }
          });
        });
      });
    });
  }
}
