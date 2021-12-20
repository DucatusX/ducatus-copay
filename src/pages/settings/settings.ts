import { ChangeDetectorRef, Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, NavController } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

import * as _ from 'lodash';

// providers
import { Observable } from 'rxjs';
// pages
import { User } from '../../models/user/user.model';
import { BitPayIdProvider, IABCardProvider } from '../../providers';
// import { AnalyticsProvider } from '../../providers/analytics/analytics';
import { AppProvider } from '../../providers/app/app';
import { BitPayCardProvider } from '../../providers/bitpay-card/bitpay-card';
import { ConfigProvider } from '../../providers/config/config';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { HomeIntegrationsProvider } from '../../providers/home-integrations/home-integrations';
import { LanguageProvider } from '../../providers/language/language';
import {
  Network,
  PersistenceProvider
} from '../../providers/persistence/persistence';
import { PlatformProvider } from '../../providers/platform/platform';
import { ProfileProvider } from '../../providers/profile/profile';
import { TouchIdProvider } from '../../providers/touchid/touchid';

// pages
import { AddPage } from '../add/add';
import { BitPaySettingsPage } from '../integrations/bitpay-card/bitpay-settings/bitpay-settings';
import { CoinbaseSettingsPage } from '../integrations/coinbase/coinbase-settings/coinbase-settings';
// import { GiftCardsSettingsPage } from '../integrations/gift-cards/gift-cards-settings/gift-cards-settings';
import { ShapeshiftSettingsPage } from '../integrations/shapeshift/shapeshift-settings/shapeshift-settings';
import { SimplexSettingsPage } from '../integrations/simplex/simplex-settings/simplex-settings';
import { PinModalPage } from '../pin/pin-modal/pin-modal';
import { AboutPage } from './about/about';
import { AddressbookPage } from './addressbook/addressbook';
import { AdvancedPage } from './advanced/advanced';
import { AltCurrencyPage } from './alt-currency/alt-currency';
import { BitPayIdPage } from './bitpay-id/bitpay-id';
import { FeePolicyPage } from './fee-policy/fee-policy';
import { KeySettingsPage } from './key-settings/key-settings';
import { LanguagePage } from './language/language';
import { LockPage } from './lock/lock';
import { NotificationsPage } from './notifications/notifications';
import { SharePage } from './share/share';
import { WalletSettingsPage } from './wallet-settings/wallet-settings';
import { FeedbackPage } from './feedback/feedback';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  public appName: string;
  public currentLanguageName: string;
  public languages;
  public config;
  public selectedAlternative;
  public isCordova: boolean;
  public lockMethod: string;
  public integrationServices = [];
  public cardServices = [];
  public bitpayCardItems = [];
  public showBitPayCard: boolean = false;
  public encryptEnabled: boolean;
  public touchIdAvailable: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public walletsGroups: any[];
  public readOnlyWalletsGroup: any[];
  public bitpayIdPairingEnabled: boolean;
  public bitPayIdUserInfo: any;
  private network = Network[this.bitPayIdProvider.getEnvironment().network];
  private user$: Observable<User>;
  public showReorder: boolean = false;
  public showTotalBalance: boolean;
  public useLegacyQrCode: boolean;

  constructor(
    private navCtrl: NavController,
    private app: AppProvider,
    private language: LanguageProvider,
    private externalLinkProvider: ExternalLinkProvider,
    public profileProvider: ProfileProvider,
    private configProvider: ConfigProvider,
    private logger: Logger,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private bitPayCardProvider: BitPayCardProvider,
    private platformProvider: PlatformProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private touchid: TouchIdProvider,
    // private analyticsProvider: AnalyticsProvider,
    private persistanceProvider: PersistenceProvider,
    private bitPayIdProvider: BitPayIdProvider,
    private changeRef: ChangeDetectorRef,
    private iabCardProvider: IABCardProvider
  ) {
    this.appName = this.app.info.nameCase;
    this.isCordova = this.platformProvider.isCordova;
    this.user$ = this.iabCardProvider.user$;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SettingsPage');
  }

  ionViewWillEnter() {
    this.persistanceProvider
      .getBitpayIdPairingFlag()
      .then(res => (this.bitpayIdPairingEnabled = res === 'enabled'));

    if (this.iabCardProvider.ref) {
      // check for user info
      this.persistanceProvider
        .getBitPayIdUserInfo(this.network)
        .then((user: User) => {
          this.bitPayIdUserInfo = user;
        });

      this.user$.subscribe(user => {
        if (user) {
          this.bitPayIdUserInfo = user;
          this.bitPayCardProvider.get({ noHistory: true }).then(cards => {
            this.showBitPayCard = !!this.app.info._enabledExtensions.debitcard;
            this.bitpayCardItems = cards;
          });
          this.changeRef.detectChanges();
        }
      });
    }

    this.currentLanguageName = this.language.getName(
      this.language.getCurrent()
    );

    const opts = {
      showHidden: true
    };
    const wallets = this.profileProvider.getWallets(opts);
    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    this.readOnlyWalletsGroup = this.profileProvider.getWalletsFromGroup({
      keyId: 'read-only'
    });

    this.config = this.configProvider.get();
    this.selectedAlternative = {
      name: this.config.wallet.settings.alternativeName,
      isoCode: this.config.wallet.settings.alternativeIsoCode
    };
    this.lockMethod =
      this.config && this.config.lock && this.config.lock.method
        ? this.config.lock.method.toLowerCase()
        : null;

    this.showTotalBalance = this.config.totalBalance.show;
    this.useLegacyQrCode = this.config.legacyQrCode.show;
  }

  ionViewDidEnter() {
    // Show integrations
    const integrations = this.homeIntegrationsProvider.get();

    // Hide BitPay if linked
    setTimeout(() => {
      this.integrationServices = _.remove(_.clone(integrations), x => {
        if (x.type == 'card') return false;
        else return x;
      });
      this.cardServices = _.remove(_.clone(integrations), x => {
        if ((x.name == 'debitcard' && x.linked) || x.type == 'exchange')
          return false;
        else return x;
      });
    }, 200);

    // Only BitPay Wallet
    this.bitPayCardProvider.get({ noHistory: true }).then(cards => {
      this.showBitPayCard = !!this.app.info._enabledExtensions.debitcard;
      this.bitpayCardItems = cards;
    });
  }

  public openBitPayIdPage(): void {
    if (this.bitPayIdUserInfo) {
      this.navCtrl.push(BitPayIdPage, this.bitPayIdUserInfo);
    } else {
      this.iabCardProvider.sendMessage(
        {
          message: 'pairingOnly'
        },
        () => {
          setTimeout(() => {
            this.iabCardProvider.show();
          }, 500);
        }
      );
    }
  }

  public openAltCurrencyPage(): void {
    this.navCtrl.push(AltCurrencyPage);
  }

  public openLanguagePage(): void {
    this.navCtrl.push(LanguagePage);
  }

  public openAdvancedPage(): void {
    this.navCtrl.push(AdvancedPage);
  }

  public openAboutPage(): void {
    this.navCtrl.push(AboutPage);
  }

  public openLockPage(): void {
    const config = this.configProvider.get();
    const lockMethod =
      config && config.lock && config.lock.method
        ? config.lock.method.toLowerCase()
        : null;
    if (!lockMethod || lockMethod == 'disabled') this.navCtrl.push(LockPage);
    if (lockMethod == 'pin') this.openPinModal('lockSetUp');
    if (lockMethod == 'fingerprint') this.checkFingerprint();
  }

  public openAddressBookPage(): void {
    this.navCtrl.push(AddressbookPage);
  }

  public openNotificationsPage(): void {
    this.navCtrl.push(NotificationsPage);
  }

  public openFeePolicyPage(): void {
    this.navCtrl.push(FeePolicyPage);
  }

  public openWalletSettingsPage(walletId: string): void {
    this.navCtrl.push(WalletSettingsPage, { walletId });
  }

  public openSharePage(): void {
    this.navCtrl.push(SharePage);
  }
  public toggleQrCodeLegacyFlag(): void {
    let opts = {
      legacyQrCode: { show: this.useLegacyQrCode }
    };
    this.configProvider.set(opts);
  }

  public openSettingIntegration(name: string): void {
    switch (name) {
      case 'coinbase':
        this.navCtrl.push(CoinbaseSettingsPage);
        break;
      case 'debitcard':
        this.navCtrl.push(BitPaySettingsPage);
        break;
      case 'shapeshift':
        this.navCtrl.push(ShapeshiftSettingsPage);
        break;
      case 'simplex':
        this.navCtrl.push(SimplexSettingsPage);
        break;
      // case 'giftcards':
      //   this.navCtrl.push(GiftCardsSettingsPage);
      //   break;
    }
  }

  public openCardSettings(id): void {
    this.persistanceProvider.getCardExperimentFlag().then(status => {
      if (status === 'enabled') {
        const message = `openSettings?${id}`;
        this.iabCardProvider.sendMessage(
          {
            message
          },
          () => {
            this.iabCardProvider.show();
          }
        );
      } else {
        this.navCtrl.push(BitPaySettingsPage, { id });
      }
    });
  }

  // public openGiftCardsSettings() {
  //   this.navCtrl.push(GiftCardsSettingsPage);
  // }

  public openFeedbackPage(): void {
    this.navCtrl.push(FeedbackPage);
  }

  private openPinModal(action): void {
    const modal = this.modalCtrl.create(
      PinModalPage,
      { action },
      { cssClass: 'fullscreen-modal' }
    );
    modal.present();
    modal.onDidDismiss(cancelClicked => {
      if (!cancelClicked) this.navCtrl.push(LockPage);
    });
  }

  private checkFingerprint(): void {
    this.touchid.check().then(() => {
      this.navCtrl.push(LockPage);
    });
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

  public openWalletGroupSettings(keyId: string): void {
    if (this.showReorder) return;
    this.navCtrl.push(KeySettingsPage, { keyId });
  }

  public goToAddView(): void {
    this.navCtrl.push(AddPage, {
      isZeroState: true
    });
  }

  public toggleShowBalanceFlag(): void {
    let opts = {
      totalBalance: { show: this.showTotalBalance }
    };
    this.configProvider.set(opts);
  }

  public reorder(): void {
    this.showReorder = !this.showReorder;
  }

  public reorderAccounts(indexes): void {
    const element = this.walletsGroups[indexes.from];
    this.walletsGroups.splice(indexes.from, 1);
    this.walletsGroups.splice(indexes.to, 0, element);
    _.each(this.walletsGroups, (walletGroup, index: number) => {
      this.profileProvider.setWalletGroupOrder(walletGroup[0].keyId, index);
    });
  }
}
