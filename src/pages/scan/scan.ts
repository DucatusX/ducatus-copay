import { Component, VERSION, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { Events, NavController, NavParams, Platform } from 'ionic-angular';

// providers
import { ErrorsProvider } from '../../providers/errors/errors';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { IncomingDataProvider } from '../../providers/incoming-data/incoming-data';
import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';
import { ScanProvider } from '../../providers/scan/scan';

// pages
import { PaperWalletPage } from '../paper-wallet/paper-wallet';
import { AmountPage } from '../send/amount/amount';
import { AddressbookAddPage } from '../settings/addressbook/add/add';

import env from '../../environments';

@Component({
  selector: 'page-scan',
  templateUrl: 'scan.html',
  providers: [ScanProvider]
})
export class ScanPage {
  ngVersion = VERSION.full;

  @ViewChild('scanner')
  scanner: ZXingScannerComponent;

  hasCameras = false;
  hasPermission: boolean;
  qrResultString: string;

  availableDevices: MediaDeviceInfo[];
  selectedDevice: MediaDeviceInfo;

  public browserScanEnabled: boolean;
  private scannerIsAvailable: boolean;
  private scannerHasPermission: boolean;
  private scannerIsDenied: boolean;
  private scannerIsRestricted: boolean;
  private unregisterBackButtonAction;
  public canEnableLight: boolean;
  public canChangeCamera: boolean;
  public lightActive: boolean;
  public cameraToggleActive: boolean;
  public scannerStates;
  public canOpenSettings: boolean;
  public currentState: string;
  public tabBarElement;
  public isCordova: boolean;
  public isCameraSelected: boolean;
  public fromAddressbook: boolean;
  public fromImport: boolean;
  public fromJoin: boolean;
  public fromSend: boolean;
  public fromMultiSend: boolean;
  public fromSelectInputs: boolean;
  public fromConfirm: boolean;

  constructor(
    private navCtrl: NavController,
    private scanProvider: ScanProvider,
    private platformProvider: PlatformProvider,
    private incomingDataProvider: IncomingDataProvider,
    private events: Events,
    private externalLinkProvider: ExternalLinkProvider,
    private logger: Logger,
    public translate: TranslateService,
    private navParams: NavParams,
    private platform: Platform,
    private errorsProvider: ErrorsProvider
  ) {
    this.isCameraSelected = false;
    this.browserScanEnabled = false;
    this.canEnableLight = true;
    this.canChangeCamera = true;
    this.scannerStates = {
      unauthorized: 'unauthorized',
      denied: 'denied',
      unavailable: 'unavailable',
      loading: 'loading',
      visible: 'visible'
    };
    this.scannerIsAvailable = true;
    this.scannerHasPermission = false;
    this.scannerIsDenied = false;
    this.scannerIsRestricted = false;
    this.canOpenSettings = false;
    this.isCordova = this.platformProvider.isCordova;
    this.tabBarElement = document.querySelector('.tabbar.show-tabbar');
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ScanPage');
  }

  ionViewWillLeave() {
    this.tabBarElement.style.display = 'flex';
    this.events.unsubscribe('incomingDataError', this.incomingDataErrorHandler);
    this.events.unsubscribe(
      'finishIncomingDataMenuEvent',
      this.finishIncomingDataMenuEventHandler
    );
    this.events.unsubscribe(
      'scannerServiceInitialized',
      this.scannerServiceInitializedHandler
    );
    if (!this.isCordova) {
      this.scanner.resetScan();
    } else {
      this.cameraToggleActive = false;
      this.lightActive = false;
      this.scanProvider.frontCameraEnabled = false;
      this.scanProvider.deactivate();
    }
    this.unregisterBackButtonAction && this.unregisterBackButtonAction();
  }

  ionViewWillEnter() {
    this.tabBarElement.style.display = 'none';
    this.initializeBackButtonHandler();
    this.fromAddressbook = this.navParams.data.fromAddressbook;
    this.fromImport = this.navParams.data.fromImport;
    this.fromJoin = this.navParams.data.fromJoin;
    this.fromSend = this.navParams.data.fromSend;
    this.fromMultiSend = this.navParams.data.fromMultiSend;
    this.fromSelectInputs = this.navParams.data.fromSelectInputs;
    this.fromConfirm = this.navParams.data.fromConfirm;

    if (!env.activateScanner) {
      // test scanner visibility in E2E mode
      this.selectedDevice = true as any;
      this.hasPermission = true;
      return;
    }

    this.events.subscribe('incomingDataError', this.incomingDataErrorHandler);

    this.events.subscribe(
      'finishIncomingDataMenuEvent',
      this.finishIncomingDataMenuEventHandler
    );

    if (!this.isCordova) {
      if (!this.isCameraSelected) {
        this.loadCamera();
      } else {
        this.scanner.startScan(this.selectedDevice);
      }
    } else {
      // try initializing and refreshing status any time the view is entered
      if (this.scannerHasPermission) {
        this.activate();
      } else {
        if (!this.scanProvider.isInitialized()) {
          this.scanProvider.gentleInitialize().then(() => {
            this.authorize();
          });
        } else {
          this.authorize();
        }
      }
      this.events.subscribe(
        'scannerServiceInitialized',
        this.scannerServiceInitializedHandler
      );
    }
  }

  private incomingDataErrorHandler: any = err => {
    this.showErrorInfoSheet(err);
  };

  private finishIncomingDataMenuEventHandler: any = data => {
    if (!this.isCordova) {
      this.scanner.resetScan();
    }
    switch (data.redirTo) {
      case 'AmountPage':
        this.sendPaymentToAddress(data.value, data.coin);
        break;
      case 'AddressBookPage':
        this.addToAddressBook(data.value);
        break;
      case 'OpenExternalLink':
        this.goToUrl(data.value);
        break;
      case 'PaperWalletPage':
        this.scanPaperWallet(data.value);
        break;
      default:
        if (this.isCordova) {
          this.activate();
        } else if (this.isCameraSelected) {
          this.scanner.startScan(this.selectedDevice);
        }
    }
  };

  private scannerServiceInitializedHandler: any = () => {
    this.logger.debug(
      'Scanner initialization finished, reinitializing scan view...'
    );
    this._refreshScanView();
  };

  private showErrorInfoSheet(error: Error | string, title?: string): void {
    let infoSheetTitle = title ? title : this.translate.instant('Error');
    this.errorsProvider.showDefaultError(error, infoSheetTitle, () => {
      if (this.isCordova) {
        this.activate();
      } else if (this.isCameraSelected) {
        this.scanner.startScan(this.selectedDevice);
      }
    });
  }

  private initializeBackButtonHandler(): void {
    this.unregisterBackButtonAction = this.platform.registerBackButtonAction(
      () => {
        this.closeCam();
      }
    );
  }

  public loadCamera() {
    this.scanner.camerasFound.subscribe((devices: MediaDeviceInfo[]) => {
      this.hasCameras = true;
      this.availableDevices = devices;
      this.onDeviceSelectChange();
    });

    this.scanner.camerasNotFound.subscribe(() => {
      this.logger.error(
        'An error has occurred when trying to enumerate your video-stream-enabled devices.'
      );
    });
    this.scanner.askForPermission().then((answer: boolean) => {
      this.hasPermission = answer;
    });
  }

  private goToUrl(url: string): void {
    this.externalLinkProvider.open(url);
  }

  private sendPaymentToAddress(bitcoinAddress: string, coin: string): void {
    this.navCtrl.push(AmountPage, { toAddress: bitcoinAddress, coin });
  }

  private addToAddressBook(bitcoinAddress: string): void {
    this.navCtrl.push(AddressbookAddPage, { addressbookEntry: bitcoinAddress });
  }

  private scanPaperWallet(privateKey: string) {
    this.navCtrl.push(PaperWalletPage, { privateKey });
  }

  private updateCapabilities(): void {
    let capabilities = this.scanProvider.getCapabilities();
    this.scannerIsAvailable = capabilities.isAvailable;
    this.scannerHasPermission = capabilities.hasPermission;
    this.scannerIsDenied = capabilities.isDenied;
    this.scannerIsRestricted = capabilities.isRestricted;
    this.canEnableLight = capabilities.canEnableLight;
    this.canChangeCamera = capabilities.canChangeCamera;
    this.canOpenSettings = capabilities.canOpenSettings;
  }

  private handleCapabilities(): void {
    // always update the view
    if (!this.scanProvider.isInitialized()) {
      this.currentState = this.scannerStates.loading;
    } else if (!this.scannerIsAvailable) {
      this.currentState = this.scannerStates.unavailable;
    } else if (this.scannerIsDenied) {
      this.currentState = this.scannerStates.denied;
    } else if (this.scannerIsRestricted) {
      this.currentState = this.scannerStates.denied;
    } else if (!this.scannerHasPermission) {
      this.currentState = this.scannerStates.unauthorized;
    }
    this.logger.debug('Scan view state set to: ' + this.currentState);
  }

  private _refreshScanView(): void {
    this.updateCapabilities();
    this.handleCapabilities();
    if (this.scannerHasPermission) {
      this.activate();
    }
  }

  public activate(): void {
    this.scanProvider
      .activate()
      .then(() => {
        this.logger.info('Scanner activated, setting to visible...');
        this.updateCapabilities();
        this.handleCapabilities();
        this.currentState = this.scannerStates.visible;

        // resume preview if paused
        this.scanProvider.resumePreview();

        this.scanProvider.scan().then((contents: string) => {
          this.scanProvider.pausePreview();
          this.handleSuccessfulScan(contents);
        });
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  private handleSuccessfulScan(contents: string): void {
    if (this.fromAddressbook) {
      this.events.publish('Local/AddressScan', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromImport) {
      this.events.publish('Local/BackupScan', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromJoin) {
      this.events.publish('Local/InvitationScan', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromSend) {
      this.events.publish('Local/AddressScan', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromMultiSend) {
      this.events.publish('Local/AddressScanMultiSend', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromSelectInputs) {
      this.events.publish('Local/AddressScanSelectInputs', { value: contents });
      this.navCtrl.pop();
    } else if (this.fromConfirm) {
      this.events.publish('Local/TagScan', { value: contents });
      this.navCtrl.pop();
    } else {
      const redirParms = { activePage: 'ScanPage' };
      this.incomingDataProvider.redir(contents, redirParms);
    }
  }

  public authorize(): void {
    this.scanProvider.initialize().then(() => {
      this._refreshScanView();
    });
  }

  public attemptToReactivate(): void {
    this.scanProvider.reinitialize();
  }

  public openSettings(): void {
    this.scanProvider.openSettings();
  }

  public toggleLight(): void {
    this.scanProvider
      .toggleLight()
      .then(resp => {
        this.lightActive = resp;
      })
      .catch(error => {
        this.logger.warn('scanner error: ' + JSON.stringify(error));
      });
  }

  public toggleCamera(): void {
    this.scanProvider
      .toggleCamera()
      .then(resp => {
        this.cameraToggleActive = resp;
        this.lightActive = false;
      })
      .catch(error => {
        this.logger.warn('scanner error: ' + JSON.stringify(error));
      });
  }

  handleQrCodeResult(resultString: string) {
    this.scanner.resetScan();
    setTimeout(() => {
      this.handleSuccessfulScan(resultString);
    }, 0);
  }

  onDeviceSelectChange() {
    if (!this.isCameraSelected) {
      for (const device of this.availableDevices) {
        if (device.kind == 'videoinput') {
          this.selectedDevice = this.scanner.getDeviceById(device.deviceId);
          this.isCameraSelected = true;
          break;
        }
      }
    }
  }

  public closeCam() {
    this.navCtrl.pop();
  }
}
