import { Component, ElementRef, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import html2canvas from 'html2canvas';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../../providers/logger/logger';

import { File } from '@ionic-native/file';
import { FileOpener } from '@ionic-native/file-opener';
import pdfMake from 'pdfmake/build/pdfmake.js';

// providers
import { ConfigProvider } from '../../../providers/config/config';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { ActionSheetProvider } from '../../../providers/index';
import { KeyProvider } from '../../../providers/key/key';
// import { PdfProvider } from '../../../providers/pdf/pdf';
import { PlatformProvider } from '../../../providers/platform/platform';
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

// import { pdfParams } from './pdf-params';

@Component({
  selector: 'page-wallet-settings',
  templateUrl: 'wallet-settings.html'
})
export class WalletSettingsPage {
  @ViewChild('paperpdf') paperpdf: ElementRef;

  public showDuplicateWallet: boolean;
  public wallet;
  public canSign: boolean;
  public needsBackup: boolean;
  public hiddenBalance: boolean;
  public encryptEnabled: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public touchIdAvailable: boolean;
  public isCordova: boolean;
  public deleted: boolean = false;
  public keysEncrypted: boolean;
  public walletsGroup;
  private config;
  private keyId;
  public paperParams: any;
  private pdfObj = null;

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
    private file: File,
    // private fileOpener: FileOpener,
    // private pdfProvider: PdfProvider,
    private actionSheetProvider: ActionSheetProvider,
    private platformProvider: PlatformProvider
  ) {
    this.logger.info('Loaded:  WalletSettingsPage');
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.isCordova = this.platformProvider.isCordova;
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
        wallet_coin: this.wallet.coin
      };

      setTimeout(() => {
        const nativeDOM = this.paperpdf.nativeElement;
        nativeDOM.style.display = 'block';

        html2canvas(nativeDOM, { width: 1000 }).then(canvas => {
          nativeDOM.style.display = 'none !important';
          var data = canvas.toDataURL();

          this.pdfObj = pdfMake.createPdf({
            content: [{
              image: data,
              width: 1000,
            }],
            pageMargins: [10, 10, 10, 10],
            pageSize: {
              width: 1020,
              height: 'auto'
            },
          })

          this.logger.debug(this.pdfObj);

          if (!this.isCordova) {

            this.pdfObj.getBlob((blob) => {
              this.logger.debug('DEVICE !!!!');
              this.logger.debug(blob);
            });

            this.pdfObj.getBuffer((buffer) => {
              this.logger.debug('TEST FOR DEVICE IN WEB !!!!');
              this.logger.debug(buffer);
              this.logger.debug(buffer["data"]);
              // var utf8 = new Uint8Array(buffer);
              // var binaryArray = utf8.buffer;
              var blob = new Blob([buffer], { type: 'application/pdf' });
              this.logger.debug(blob);

              // let binaryLen = buffer["data"].length;
              // let bytes = new Uint8Array(binaryLen);
              // for (let i = 0; i < binaryLen; i++) {
              //   let ascii = buffer["data"].charCodeAt(i);
              //   bytes[i] = ascii;
              // }
              //
              // let blob = new Blob([bytes], { type: "application/pdf" });
              //
              // this.logger.debug(blob);
              //
              let link = document.createElement('a');

              link.href = window.URL.createObjectURL(blob);
              link.download = 'pdf_test.pdf';

              link.click();
            });


            // this.logger.debug('WEB WORK !!!!');
            // this.pdfObj.download("ducatus-wallet.pdf");
          }
          else {
            pdfMake.createPdf({
              content: [{
                image: data,
                width: 1000,
              }],
              pageMargins: [10, 10, 10, 10],
              pageSize: {
                width: 1020,
                height: 'auto'
              },
            }).getBuffer((buffer) => {
              this.logger.debug('DEVICE !!!!');
              this.logger.debug(buffer);

              var utf8 = new Uint8Array(buffer);
              var binaryArray = utf8.buffer;
              var blob = new Blob([binaryArray], { type: 'application/pdf' });

              this.logger.debug(blob);

              this.file.writeFile(this.file.dataDirectory, 'ducatus-wallet.pdf', blob, { replace: true }).then(() => {
                this.logger.debug('DEVICE write to file');
                FileOpener.open(this.file.dataDirectory + 'ducatus-wallet.pdf', 'application/pdf');
              })
            });
          }

          this.paperParams = null;
        });

        // html2canvas(nativeDOM, { width: 1000 }, {
        //   onrendered(canvas) {
        //     nativeDOM.style.display = 'none !important';
        //     var data = canvas.toDataURL();
        //     var docDefinition = {
        //       content: [{
        //         image: data,
        //         width: 1000,
        //       }]
        //     };

        //     let objPdf = pdfMake.createPdf(docDefinition);
        //     this.logger.debug('WEB WORK !!!!');
        //     this.logger.debug(objPdf);
        //     objPdf.download("ducatus-wallet.pdf");

        //     // this.pdfObj = pdfMake.createPdf(docDefinition);

        //     if (this.isCordova) {
        //       let objPdf = pdfMake.createPdf(docDefinition);
        //       this.logger.debug('WEB WORK !!!!');
        //       this.logger.debug(objPdf);
        //       objPdf.download("ducatus-wallet.pdf");
        //     }
        //     else {
        //       pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
        //         var blob = new Blob([buffer], { type: 'application/pdf' });

        //         // Save the PDF to the data Directory of our App
        //         this.file.writeFile(this.file.dataDirectory, 'ducatus-wallet.pdf', blob, { replace: true }).then(() => {
        //           // Open the PDf with the correct OS tools
        //           this.fileOpener.open(this.file.dataDirectory + 'ducatus-wallet.pdf', 'application/pdf');
        //         })
        //       });
        //     }

        //     this.paperParams = null;
        //   }
        // });

        // html2canvas(nativeDOM, { width: 1000 }).then(canvas => {

        // });

        // html2canvas(nativeDOM, { width: 1000 }).then(canvas => {
        //   nativeDOM.style.display = 'none !important';
        //   imgData = canvas.toDataURL('image/png');
        //   this.logger.debug('HTML2CANVAS WORK !!!!');

        //   if (this.isCordova) {
        //     this.logger.debug('WEB WORK !!!!');
        //     this.downloadLink.nativeElement.href = imgData;
        //     this.downloadLink.nativeElement.download = 'ducatus-wallet.png';
        //     this.downloadLink.nativeElement.click();
        //   }
        //   else {
        //     this.logger.debug('IOS WORK !!!!');

        //     // cordova.fileTransfer.upload(imgData, '<api endpoint>', {
        //     //   fileKey: 'file',
        //     //   fileName: 'name.jpg',
        //     //   headers: {}
        //     // })
        //     //   .then((data) => {
        //     //     this.logger.debug('Saved image to gallery ', data)
        //     //   }, (err) => {
        //     //     this.logger.debug('Error saving image to gallery ', err)
        //     //   })

        //     cordova.base64ToGallery.base64ToGallery(imgData, { prefix: "_img", mediaScanner: true }).then(
        //       res => this.logger.debug('Saved image to gallery ', res),
        //       err => this.logger.debug('Error saving image to gallery ', err)
        //     );
        //   }

        //   this.paperParams = null;

        //   // this.pdfProvider.makePdf(
        //   //   '<html>' + pdfParams.mobileStyle + '<body id="paper-pdf">' +
        //   //   nativeDOM.innerHTML +
        //   //   '</body></html>', imgData
        //   // );

        // });
      });
    });

  }

  // public generateBlob(infoToBlob) {

  // }

  // public printPaperWallet(): void {
  //   if (this.needsBackup) {
  //     this.openBackupModal();
  //     return;
  //   }

  //   const qrKey = this.generateQrKey();
  //   const walletAddress = this.getAddress();

  //   Promise.all([qrKey, walletAddress]).then((result) => {
  //     const res = {};
  //     result.forEach((resItem: { key: string, value: string }) => {
  //       res[resItem.key] = resItem.value;
  //     });
  //     return res
  //   }).then((res: any) => {
  //     const qrKey = res.key;
  //     const walletAddress = res.address;
  //     if (!qrKey || !walletAddress) {
  //       this.logger.debug('must have qrKey and address: ' + qrKey, walletAddress);
  //       return;
  //     }

  //     this.paperParams = {
  //       key_qr: qrKey,
  //       wallet_address: walletAddress,
  //       wallet_coin: this.wallet.coin
  //     };

  //     setTimeout(() => {
  //       const nativeDOM = this.paperpdf.nativeElement;
  //       let imgData;

  //       nativeDOM.style.display = 'block';

  //       html2canvas(nativeDOM, { width: 1000 }).then(canvas => {
  //         nativeDOM.style.display = 'none !important';
  //         imgData = canvas.toDataURL('image/png');
  //         this.paperParams = null;

  //         this.pdfProvider.makePdf(
  //           '<html>' + pdfParams.mobileStyle + '<body id="paper-pdf">' +
  //           nativeDOM.innerHTML +
  //           '</body></html>', imgData
  //         );

  //       });
  //     });
  //   });

  // }
}


