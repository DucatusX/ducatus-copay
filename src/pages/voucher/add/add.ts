import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from 'ionic-angular';
import _ from 'lodash';
import { Logger } from '../../../../src/providers/logger/logger';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';
import { VOUCHER_URL_REQUEST } from '../params';

@Component({
  selector: 'page-voucher',
  templateUrl: 'add.html'
})
export class VoucherAddPage {
  public VoucherGroup: FormGroup;

  public wallet: any;
  public walletsGroups: any[];
  public walletAddresses: any;
  public sendLength: number = 0;
  public voucherLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private alertCtrl: AlertController,
    private httpClient: HttpClient,
    private bwcProvider: BwcProvider,
    private logger: Logger
  ) {
    this.VoucherGroup = this.formBuilder.group({
      VoucherGroupCode: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      VoucherGroupAddress: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

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
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return {
          keyId: wallet.keyId,
          requestPubKey: wallet.credentials.requestPubKey,
          wallet,
          address
        };
      });
    });

    wallets.map(res => {
      res.then(result => {
        walletsRes.push(result);
      });
      this.sendLength++;
    });

    if (this.sendLength === 1) {
      wallets.map(res => {
        res.then(result => {
          this.VoucherGroup.value.VoucherGroupAddress = result.address;
        });
      });
    }

    this.walletAddresses = walletsRes;
  }

  public openAddressList() {
    if (!this.voucherLoading) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        if (option) {
          this.VoucherGroup.value.VoucherGroupAddress = option;
        }
      });
    }
  }

  private showModal(type: string, opt?: any) {
    const options = {
      usd: opt ? opt.usd : '1',
      duc: opt ? opt.duc : '20',
      min: opt ? opt.min : '15',
      day: opt ? opt.day : '14'
    };

    const modalAnswers = {
      ok: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your ${
          options.usd
        }$ voucher successfully activated. You will get ${
          options.duc
        } Ducatus in ${options.min} minutes`,
        button: 'OK'
      },
      ok_freeze: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your $${
          options.usd
        } voucher succesfully activated. You can withdraw your ${
          options.duc
        } Ducatus after ${options.day} days`,
        button: 'OK'
      },
      error: {
        title:
          '<img src="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Please check your activation code',
        button: 'OK'
      },
      registated: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Your voucher was already registered',
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
      : modalAnswers['error'];

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.voucherLoading = false;
            if (type != 'network') {
              this.VoucherGroup.value.VoucherGroupAddress = '';
              this.VoucherGroup.value.VoucherGroupCode = '';
            }
          }
        }
      ]
    });
    alert.present();
  }

  private sendCode(
    wallet_id: string,
    duc_address: string,
    duc_public_key: string,
    activation_code: string,
    private_path: string
  ) {
    this.logger.log(
      '{VOUCHER_URL_REQUEST}transfer/',
      `${VOUCHER_URL_REQUEST}transfer/${wallet_id},${duc_address},${duc_public_key},${activation_code},${private_path}`
    );
    return this.httpClient
      .post(`${VOUCHER_URL_REQUEST}/transfer/`, {
        wallet_id,
        duc_address,
        duc_public_key,
        activation_code,
        private_path
      })
      .toPromise();
  }

  public async activateVoucher() {
    this.voucherLoading = true;
    this.walletAddresses;

    const walletToSend = this.walletAddresses.find(
      t => t.address === this.VoucherGroup.value.VoucherGroupAddress
    );

    const info = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
      walletToSend.wallet.credentials.xPubKey
    );

    const pubKey = await this.walletProvider
      .getMainAddresses(walletToSend.wallet, { doNotVerify: false })
      .then(result => {
        const address = result.find(t => {
          return t.address === this.VoucherGroup.value.VoucherGroupAddress;
        });
        return info.derive(address.path).publicKey.toString();
      });

    const addressData = await this.walletProvider
      .getMainAddresses(walletToSend.wallet, {
        doNotVerify: false
      })
      .then(result => {
        return result.find(t => {
          return t.address === this.VoucherGroup.value.VoucherGroupAddress;
        });
      });

    this.sendCode(
      walletToSend.keyId,
      this.VoucherGroup.value.VoucherGroupAddress,
      pubKey,
      this.VoucherGroup.value.VoucherGroupCode,
      addressData.path
    )
      .then(res => {
        const result: any = res;

        result.lock_days !== 0
          ? this.showModal('ok_freeze', {
              usd: result.usd_amount,
              duc: result.duc_amount,
              day: result.lock_days
            })
          : this.showModal('ok', {
              usd: result.usd_amount,
              duc: result.duc_amount,
              min: '15'
            });
      })
      .catch(err => {
        switch (err.status) {
          case 403:
            if (
              [
                'This voucher is not active',
                'Invalid activation code'
              ].includes(err.error.detail)
            )
              this.showModal('error');
            if (err.error.detail == 'This voucher already used')
              this.showModal('registated');
            break;
          default:
            this.showModal('network');
            break;
        }
      });
  }
}
