import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController } from 'ionic-angular';
import _ from 'lodash';
import { Logger } from '../../../../src/providers/logger/logger';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { IncomingDataProvider } from '../../../providers/incoming-data/incoming-data';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import { WalletProvider } from '../../../providers/wallet/wallet';
import { DEPOSIT_URL_REQUEST } from '../params';

@Component({
  selector: 'page-deposit-add',
  templateUrl: 'deposit-add.html'
})
export class DepositAddPage {
  public DepositGroup: FormGroup;

  public wallet: any;
  public walletsGroups: any[];
  public walletAddresses: any;
  public sendLength: number = 0;
  public depositLoading = false;
  public amountWithPercent: any;
  public amountWallet = 0;
  public depositMonth = 13;
  public depositPercent = 8;
  public maxAmount = 0;

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private incomingDataProvider: IncomingDataProvider,
    private txFormatProvider: TxFormatProvider,
    private alertCtrl: AlertController,
    private httpClient: HttpClient,
    private bwcProvider: BwcProvider,
    private logger: Logger
  ) {
    this.DepositGroup = this.formBuilder.group({
      Amount: [
        0,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      Address: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      Month: ['13', Validators.compose([Validators.required])],
      Percent: ['8', Validators.compose([Validators.required])]
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

  public uMonth() {
    if (this.DepositGroup.value.Month === '5')
      this.DepositGroup.controls.Percent.setValue('5');
    if (this.DepositGroup.value.Month === '13')
      this.DepositGroup.controls.Percent.setValue('8');
    if (this.DepositGroup.value.Month === '34')
      this.DepositGroup.controls.Percent.setValue('13');

    this.changeAmount();
  }

  public uPercent() {
    if (this.DepositGroup.value.Percent === '5')
      this.DepositGroup.controls.Month.setValue('5');
    if (this.DepositGroup.value.Percent === '8')
      this.DepositGroup.controls.Month.setValue('13');
    if (this.DepositGroup.value.Percent === '13')
      this.DepositGroup.controls.Month.setValue('34');

    this.changeAmount();
  }

  public changeAmount() {
    const amount = this.DepositGroup.value.Amount
      ? parseFloat(this.DepositGroup.value.Amount)
      : 0;

    const amountWithPercentValue = (
      amount *
      (parseFloat(this.DepositGroup.value.Percent) / 100) *
      (parseFloat(this.DepositGroup.value.Month) / 12)
    ).toFixed(4);

    this.amountWithPercent = amountWithPercentValue;
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
          this.DepositGroup.value.Address = result.address;
        });
      });
    }

    this.walletAddresses = walletsRes;
  }

  public openAddressList() {
    if (!this.depositLoading) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        if (option) {
          this.DepositGroup.value.Address = option;
          this.wallet = this.walletAddresses.find(t => t.address === option);
          this.sendMax();
        }
      });
    }
  }

  private showModal(type: string) {
    const modalAnswers = {
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
            this.depositLoading = false;
            if (type != 'network') {
              this.DepositGroup.value.Address = '';
              this.DepositGroup.value.Amount = '';
            }
          }
        }
      ]
    });
    alert.present();
  }

  private generateDeposit(
    wallet_id: string,
    duc_address: string,
    duc_public_key: string,
    lock_months: number,
    private_path: string
  ) {
    this.logger.log(
      '{DEPOSIT_URL_REQUEST}generate_deposit/',
      `${DEPOSIT_URL_REQUEST}generate_deposit/${wallet_id},${duc_address},${duc_public_key},${lock_months}`
    );
    return this.httpClient
      .post(`${DEPOSIT_URL_REQUEST}generate_deposit/`, {
        wallet_id,
        duc_address,
        duc_public_key,
        lock_months,
        private_path
      })
      .toPromise();
  }

  public updAmountToMax() {
    this.DepositGroup.controls.Amount.setValue(this.maxAmount);
    this.changeAmount();
  }

  public sendMax() {
    const { token } = this.wallet.wallet.credentials;

    this.walletProvider
      .getBalance(this.wallet.wallet, {
        tokenAddress: token ? token.address : ''
      })
      .then(resp => {
        this.maxAmount = resp.availableAmount / 100000000;
        this.logger.log('maxAmount', this.maxAmount);
      });
  }

  public async generateUserDeposit() {
    this.depositLoading = true;
    this.walletAddresses;

    const walletToSend = this.walletAddresses.find(
      t => t.address === this.DepositGroup.value.Address
    );

    const info = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
      walletToSend.wallet.credentials.xPubKey
    );

    const pubKey = await this.walletProvider
      .getMainAddresses(walletToSend.wallet, { doNotVerify: false })
      .then(result => {
        const address = result.find(t => {
          return t.address === this.DepositGroup.value.Address;
        });

        return info.derive(address.path).publicKey.toString();
      });

    const addressData = await this.walletProvider
      .getMainAddresses(walletToSend.wallet, {
        doNotVerify: false
      })
      .then(result => {
        return result.find(t => {
          return t.address === this.DepositGroup.value.Address;
        });
      });

    this.logger.log(addressData, addressData);

    this.generateDeposit(
      walletToSend.keyId,
      this.DepositGroup.value.Address,
      pubKey,
      parseFloat(this.DepositGroup.value.Month),
      addressData.path
    )
      .then(res => {
        const result: any = res;

        if (result.cltv_details.locked_duc_address) {
          const addressView = this.walletProvider.getAddressView(
            walletToSend.wallet.coin,
            walletToSend.wallet.network,
            result.cltv_details.locked_duc_address,
            true
          );

          const parsedAmount = this.txFormatProvider.parseAmount(
            walletToSend.wallet.coin.toLowerCase(),
            this.DepositGroup.value.Amount,
            walletToSend.wallet.coin.toUpperCase()
          );

          const redirParms = {
            activePage: 'ScanPage',
            walletId: walletToSend.wallet.id,
            amount: parsedAmount.amountSat
          };

          this.incomingDataProvider.redir(addressView, redirParms);
        }
      })
      .catch(err => {
        this.showModal('network');
        this.logger.log(err);
      });
  }
}
