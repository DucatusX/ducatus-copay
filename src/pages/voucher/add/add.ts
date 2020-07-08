import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from 'ionic-angular';
import _ from 'lodash';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { Logger } from '../../../providers/logger/logger';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

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

  private modalAnswers = {
    ok: {
      title:
        '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
      text:
        'Your $5 voucher successfully activated <br> You will get 100 Ducatus in 15 minutes',
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
    }
  };

  constructor(
    private logger: Logger,
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private alertCtrl: AlertController,
    private httpClient: HttpClient
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
        return { wallet, address };
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
    } else {
      this.walletAddresses = walletsRes;
    }
  }

  public openAddressList() {
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

  private showModal(type: string) {
    const answers = this.modalAnswers[type]
      ? this.modalAnswers[type]
      : this.modalAnswers['error'];

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.logger.debug('modal click ok');
          }
        }
      ]
    });
    alert.present();
  }

  private sendCode(address: string, code: string) {
    return this.httpClient
      .post('http://ducsite.rocknblock.io/api/v3/' + 'transfer/', {
        duc_address: address,
        activation_code: code
      })
      .toPromise();
  }

  public activateVoucher() {
    this.sendCode(
      this.VoucherGroup.value.VoucherGroupAddress,
      this.VoucherGroup.value.VoucherGroupCode
    )
      .then(res => {
        console.log(res);
        this.showModal('ok');
      })
      .catch(err => {
        console.log(err);
      });
  }
}
