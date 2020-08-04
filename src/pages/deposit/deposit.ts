import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { BwcProvider } from '../../providers/bwc/bwc';
import { DepositAddPage } from './deposit-add/deposit-add';

import * as bip65 from 'bip65';
import * as bitcoin from 'bitcoinjs-lib';
import _ from 'lodash';

import { Logger, ProfileProvider, WalletProvider } from '../../providers';
import { DEPOSIT_URL_REQUEST } from './params';

@Component({
  selector: 'page-deposit',
  templateUrl: 'deposit.html'
})
export class DepositPage {
  public depositsLoading = true;
  public deposits = [];
  public walletsGroups: any;
  public wallets: any;

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

    this.getDeposits();

    let walletsGet = this.getWalletsInfoAddress('duc');

    Promise.all([walletsGet]).then(results => {
      this.wallets = results[0];
      console.log(this.wallets);
    });
  }

  private getWalletsInfoAddress(coin) {
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
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return { wallet, address };
      });
    });

    wallets.map(res => {
      res.then(result => {
        walletsRes.push(result);
      });
    });

    return walletsRes;
  }

  private getDeposits() {
    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.keyId)) walletsResult.push(res.keyId);
      });

      this.logger.log(
        'get_deposits/?wallet_ids=',
        `${DEPOSIT_URL_REQUEST}get_deposits/?wallet_ids=${walletsResult}`
      );

      this.httpClient
        .get(`${DEPOSIT_URL_REQUEST}get_deposits/?wallet_ids=${walletsResult}`)
        .toPromise()
        .then(result => {
          this.deposits = result as any;
          this.logger.log('got user vouchers:', this.deposits);

          this.deposits.map(x => {
            if (x.depositinput_set.length != 0) {
              x.ended_at_date = new Date(x.ended_at * 1000);
              x.duc_added = (
                x.duc_amount *
                (x.dividends / 100) *
                (x.lock_months / 12)
              ).toFixed(2);
            }
            x.freez_date = new Date(x.cltv_details.lock_time * 1000);
            x.freez_date_count = Math.ceil(
              Math.abs(x.freez_date.getTime() - new Date().getTime()) /
                (1000 * 3600 * 24)
            );
            x.withdrow_check = false;
          });

          this.depositsLoading = false;
          this.logger.log('updated user vouchers:', this.deposits);
        })
        .catch(err => this.logger.debug(err));
    });
  }

  public goToDepositAddPage() {
    this.navCtrl.push(DepositAddPage);
  }

  private getAddress(wallet) {
    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        return resolve(addr);
      });
    });
  }

  private getDeposit(id) {
    this.logger.log(
      '/get_deposit_info/?deposit_id=',
      `${DEPOSIT_URL_REQUEST}get_deposit_info/?deposit_id=${id}`
    );
    return this.httpClient
      .get(`${DEPOSIT_URL_REQUEST}get_deposit_info/?deposit_id=${id}`)
      .toPromise();
  }

  private sendTX(raw_tx_hex) {
    this.logger.log(
      '/send_deposit_transaction/',
      `${DEPOSIT_URL_REQUEST}send_deposit_transaction/${raw_tx_hex}`
    );
    return this.httpClient
      .post(`${DEPOSIT_URL_REQUEST}send_deposit_transaction/`, {
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

  private async signFreeze(wallet: any, data: any, addressPath: boolean) {
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

        const address = addressPath
          ? await this.walletProvider
              .getMainAddresses(wallet, { doNotVerify: false })
              .then(result => {
                return result.find(t => {
                  if (t.address === data.user_duc_address) {
                    return t.path;
                  }
                });
              })
          : data.private_path;

        return xpriv.deriveChild(address).privateKey.toWIF();
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

  private showModal(type: string, id?: number, ducAmount?: number) {
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
      cssClass: 'deposit-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.deposits.map(t => {
              this.getDeposits();
              if (t.id === id) t.withdrow_check = false;
            });
          }
        }
      ]
    });
    alert.present();
  }

  private debounceGetDeposits = _.debounce(
    async () => {
      this.getDeposits();
    },
    5000,
    {
      leading: true
    }
  );

  public doRefresh(refresher): void {
    this.debounceGetDeposits();
    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }

  public withdrowTrigger(id: number) {
    this.deposits.map(t => {
      if (t.id === id) t.withdrow_check = true;
    });

    this.getDeposit(id).then(async res => {
      const deposit: any = res;

      deposit.cltv_details.sending_amount =
        deposit.depositinput_set[0].amount - deposit.tx_fee;
      deposit.cltv_details.tx_hash = deposit.depositinput_set[0].mint_tx_hash;
      deposit.cltv_details.user_duc_address = deposit.user_duc_address;
      deposit.cltv_details.vout_number = deposit.depositinput_set[0].tx_vout;

      const addressFilter = this.wallets.find(t => {
        return t.address === deposit.cltv_details.user_duc_address;
      });

      console.log('addressFilter', addressFilter);

      const walletToUnfreeze = addressFilter
        ? addressFilter.wallet
        : this.wallets.find(t => {
            return t.wallet.keyId === deposit.wallet_id;
          }).wallet;

      console.log('walletFilter', walletToUnfreeze);

      const txHex = await this.signFreeze(
        walletToUnfreeze,
        deposit.cltv_details,
        !!addressFilter
      );

      this.logger.log('freeze transaction hex', txHex);

      this.sendTX(txHex)
        .then(res => {
          this.logger.log('transaction sended', res);
          this.showModal('success', id, deposit.duc_amount);
        })
        .catch(err => {
          err.error.detail === '-27: transaction already in block chain'
            ? this.showModal('alreadyActivated', id)
            : this.showModal('network', id);
          this.logger.error('transaction not sended', err, err.error.detail);
        });
    });
  }
}
