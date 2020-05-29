import { Component, ElementRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../../providers/logger/logger';
import * as QRCode from 'qrcode-svg';

// providers
import { ConfigProvider } from '../../../providers/config/config';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { ActionSheetProvider } from '../../../providers/index';
import { KeyProvider } from '../../../providers/key/key';
import { PdfProvider } from '../../../providers/pdf/pdf';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TouchIdProvider } from '../../../providers/touchid/touchid';
import { WalletProvider } from '../../../providers/wallet/wallet';

// pages
import { BackupKeyPage } from '../../../pages/backup/backup-key/backup-key';
import { WalletDeletePage } from './wallet-delete/wallet-delete';
import { WalletNamePage } from './wallet-name/wallet-name';
import { WalletAddressesPage } from './wallet-settings-advanced/wallet-addresses/wallet-addresses';
import { WalletDuplicatePage } from './wallet-settings-advanced/wallet-duplicate/wallet-duplicate';
import { WalletExportPage } from './wallet-settings-advanced/wallet-export/wallet-export';
import { WalletInformationPage } from './wallet-settings-advanced/wallet-information/wallet-information';
import { WalletServiceUrlPage } from './wallet-settings-advanced/wallet-service-url/wallet-service-url';
import { WalletTransactionHistoryPage } from './wallet-settings-advanced/wallet-transaction-history/wallet-transaction-history';

import { pdfParams } from './pdf-params';

@Component({
  selector: 'page-wallet-settings',
  templateUrl: 'wallet-settings.html'
})
export class WalletSettingsPage {

  @ViewChild('paperpdf', {read: ElementRef}) paperpdf: ElementRef;

  public showDuplicateWallet: boolean;
  public wallet;
  public canSign: boolean;
  public needsBackup: boolean;
  public hiddenBalance: boolean;
  public encryptEnabled: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public touchIdAvailable: boolean;
  public deleted: boolean = false;
  public keysEncrypted: boolean;
  public walletsGroup;
  private config;
  private keyId;
  public paperParams: any;

  constructor(
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private configProvider: ConfigProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private touchIdProvider: TouchIdProvider,
    private translate: TranslateService,
    private keyProvider: KeyProvider,
    private events: Events,
    private pdfProvider: PdfProvider,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.logger.info('Loaded:  WalletSettingsPage');
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
  }

  ionViewWillEnter() {
    this.canSign = this.wallet.canSign;
    this.keyId = this.navParams.data.keyId;
    this.needsBackup = this.wallet.needsBackup;
    this.hiddenBalance = this.wallet.balanceHidden;
    this.encryptEnabled = this.wallet.isPrivKeyEncrypted;
    this.walletsGroup = this.profileProvider.getWalletGroup(this.keyId);
    this.keysEncrypted = this.walletsGroup.isPrivKeyEncrypted;

    this.checkBiometricIdAvailable();

    this.config = this.configProvider.get();
    this.touchIdEnabled = this.config.touchIdFor
      ? this.config.touchIdFor[this.wallet.credentials.walletId]
      : null;
    this.touchIdPrevValue = this.touchIdEnabled;
    if (
      this.wallet.credentials &&
      !this.wallet.credentials.mnemonicEncrypted &&
      !this.wallet.credentials.mnemonic
    ) {
      this.deleted = true;
    }
    this.showDuplicateWallet = this.getShowDuplicateWalletOption();
  }

  private getShowDuplicateWalletOption(): boolean {
    if (this.wallet.network != 'livenet' || this.wallet.coin != 'btc')
      return false;

    const key = this.keyProvider.getKey(this.wallet.credentials.keyId);
    if (!key) return false;

    // only available for OLD multisig wallets. or single sig
    if (this.wallet.n > 1 && !key.use44forMultisig) return false;

    // only first account
    if (this.wallet.credentials.account != 0) return false;

    return true;
  }

  private checkBiometricIdAvailable() {
    this.touchIdProvider.isAvailable().then((isAvailable: boolean) => {
      this.touchIdAvailable = isAvailable;
    });
  }

  public hiddenBalanceChange(): void {
    this.profileProvider.toggleHideBalanceFlag(
      this.wallet.credentials.walletId
    );
  }

  public openSupportEncryptPassword(): void {
    const url =
      'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('Read more in our support page');
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public touchIdChange(): void {
    if (this.touchIdPrevValue == this.touchIdEnabled) return;
    const newStatus = this.touchIdEnabled;
    this.walletProvider
      .setTouchId([].concat(this.wallet), newStatus)
      .then(() => {
        this.touchIdPrevValue = this.touchIdEnabled;
        this.logger.debug('Touch Id status changed: ' + newStatus);
      })
      .catch(err => {
        this.logger.error('Error with fingerprint:', err);
        this.checkBiometricIdAvailable();
        this.touchIdEnabled = this.touchIdPrevValue;
      });
  }

  public openWalletName(): void {
    this.navCtrl.push(WalletNamePage, {
      walletId: this.wallet.credentials.walletId
    });
  }

  public openWalletInformation(): void {
    this.navCtrl.push(WalletInformationPage, {
      walletId: this.wallet.credentials.walletId
    });
  }
  public openWalletAddresses(): void {
    this.navCtrl.push(WalletAddressesPage, {
      walletId: this.wallet.credentials.walletId
    });
  }
  public openExportWallet(): void {
    this.navCtrl.push(WalletExportPage, {
      walletId: this.wallet.credentials.walletId
    });
  }
  public openWalletServiceUrl(): void {
    this.navCtrl.push(WalletServiceUrlPage, {
      walletId: this.wallet.credentials.walletId
    });
  }
  public openTransactionHistory(): void {
    this.navCtrl.push(WalletTransactionHistoryPage, {
      walletId: this.wallet.credentials.walletId
    });
  }
  public openDuplicateWallet(): void {
    this.navCtrl.push(WalletDuplicatePage, {
      walletId: this.wallet.credentials.walletId
    });
  }

  public hiddenWalletChange(walletId: string): void {
    if (!walletId) return;
    this.profileProvider.toggleHideWalletFlag(walletId);
    this.events.publish('Local/WalletListChange');
  }

  public openWalletGroupDelete(): void {
    this.navCtrl.push(WalletDeletePage, {
      keyId: this.wallet.keyId,
      walletId: this.wallet.id
    });
  }

  private generateQrKey() {
    return this.keyProvider
      .handleEncryptedWallet(this.keyId)
      .then((password: string) => {
        const keys = this.keyProvider.get(this.keyId, password);
        this.keysEncrypted = false;

        if (!keys || !keys.mnemonic) {
          const err = this.translate.instant('Exporting via QR not supported for this wallet');
          const title = this.translate.instant('Error');
          this.logger.debug(title, err);
          // this.showErrorInfoSheet(err, title);
          return false;
        }

        const mnemonicHasPassphrase = this.keyProvider.mnemonicHasPassphrase(this.keyId);
        this.logger.debug('QR code generated. mnemonicHasPassphrase: ' + mnemonicHasPassphrase);
        const code = '1|' + keys.mnemonic + '|null|null|' + mnemonicHasPassphrase + '|null';

        return {
          key: 'key',
          value: code
        }
      })
  }

  private getAddress() {
    return this.walletProvider.getAddress(this.wallet, false).then((address) => {
      return {
        key: 'address',
        value: address
      }
    });
  }

  public openBackupModal(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'backup-needed-with-activity'
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) this.openBackup();
    });
  }

  public openBackup() {
    this.navCtrl.push(BackupKeyPage, {
      keyId: this.wallet.credentials.keyId
    });
  }

  public printPaperWallet(): void {

    // let wallet = this.profileProvider.getWallet(this.wallet.credentials.walletId);
    if (this.needsBackup) {
      this.openBackupModal();
      return;
    }

    const qrKey = this.generateQrKey();
    const walletAddress = this.getAddress();

    Promise.all([qrKey, walletAddress]).then((result) => {
      const res = {};
      result.forEach((resItem: { key: string, value: string }) => {
        res[resItem.key] = resItem.value;
      });
      return res
    }).then((res: any) => {
      const qrKey = res.key;
      const walletAddress = res.address;
      if (!qrKey || !walletAddress) {
        this.logger.debug('must have qrKey and address: ' + qrKey, walletAddress);
        return;
      }

      this.paperParams = {
        key_qr: qrKey,
        wallet_address: walletAddress,
        wallet_coin: this.wallet.coin,
        svgAddress: new QRCode({
          content: walletAddress,
          join: true,
          container: 'svg-viewbox',
          padding: 3,
          ecl: "L",
        }).svg(),
        svgKey: new QRCode({
          content: qrKey,
          join: true,
          container: 'svg-viewbox',
          padding: 3,
          ecl: "L",
        }).svg()
      };

      setTimeout(() => {
        const nativeDOM = this.paperpdf.nativeElement;
        nativeDOM.querySelector('#walletAddress').innerHTML = this.paperParams.svgAddress;
        nativeDOM.querySelector('#walletQR').innerHTML = this.paperParams.svgKey;
        this.pdfProvider.makePdf(
          '<html>' + pdfParams.mobileStyle + '<body id="paper-pdf">' +
          nativeDOM.innerHTML +
          '</body></html>'
        );
      });

    });

  }
}


