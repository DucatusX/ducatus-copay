import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from 'ionic-angular';
import _ from 'lodash';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { Logger } from '../../../providers/logger/logger';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';
// import { HttpClient } from '@angular/common/http';

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

  constructor(
    private logger: Logger,
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private alertCtrl: AlertController
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

  public activateVoucher() {
    const answers = {
      ok: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: 'Please check your activation code',
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

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers['ok'].title,
      message: answers['ok'].text,
      buttons: [
        {
          text: answers['ok'].button,
          handler: () => {
            this.logger.debug('modal click ok');
          }
        }
      ]
    });
    alert.present();
  }
}
