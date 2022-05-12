import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AlertController,
  App,
  Events,
  ModalController,
  NavController,
  NavParams
} from 'ionic-angular';
import * as _ from 'lodash';

// pages
import { ImportWalletPage } from '../../add/import-wallet/import-wallet';
import { KeyOnboardingPage } from '../../settings/key-settings/key-onboarding/key-onboarding';
import { TabsPage } from '../../tabs/tabs';
import { CreateWalletPage } from '../create-wallet/create-wallet';

// providers
import {
  ActionSheetProvider,
  BwcErrorProvider,
  ErrorsProvider,
  Logger,
  OnGoingProcessProvider,
  PersistenceProvider,
  ProfileProvider,
  PushNotificationsProvider,
  WalletProvider
} from '../../../providers';
import {
  Coin,
  CoinsMap,
  CurrencyProvider
} from '../../../providers/currency/currency';
import { Token } from '../../../providers/currency/token';

@Component({
  selector: 'page-select-currency',
  templateUrl: 'select-currency.html'
})
export class SelectCurrencyPage {
  private showKeyOnboarding: boolean;

  public title: string;
  public coin: Coin;
  public coinsSelected = {} as CoinsMap<boolean>;
  public tokensSelected = {} as CoinsMap<boolean>;
  public tokenDisabled = {} as CoinsMap<boolean>;

  public availableChains: string[];
  public availableTokens: Token[];
  public drcAvailableTokens: Token[];
  public isOnboardingFlow: boolean;
  public isZeroState: boolean;

  constructor(
    private app: App,
    private events: Events,
    private actionSheetProvider: ActionSheetProvider,
    private currencyProvider: CurrencyProvider,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private logger: Logger,
    private navParam: NavParams,
    private profileProvider: ProfileProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private walletProvider: WalletProvider,
    private pushNotificationsProvider: PushNotificationsProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private persistenceProvider: PersistenceProvider,
    private errorsProvider: ErrorsProvider
  ) {
    this.availableChains = this.navParam.data.isShared
      ? this.currencyProvider.getMultiSigCoins()
      : this.currencyProvider.getAvailableChains();
    this.availableTokens = this.currencyProvider.getAvailableTokens();
    this.drcAvailableTokens = this.currencyProvider.getDRCAvailableTokens();
    // for (const coin of this.availableChains) {
    this.coinsSelected['duc'] = true;
    this.coinsSelected['ducx'] = true;
    // }
    this.shouldShowKeyOnboarding();
    this.setTokens();
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SelectCurrencyPage');
    this.isOnboardingFlow = this.navParam.data.isOnboardingFlow;
    this.isZeroState = this.navParam.data.isZeroState;
    this.title = this.isZeroState
      ? this.translate.instant('Select Currencies')
      : this.translate.instant('Select Currency');
  }

  private shouldShowKeyOnboarding() {
    this.persistenceProvider.getKeyOnboardingFlag().then(value => {
      if (!value) {
        this.showKeyOnboarding = true;
        const wallets = this.profileProvider.getWallets();
        const walletsGroups = _.values(_.groupBy(wallets, 'keyId'));
        walletsGroups.forEach((walletsGroup: any) => {
          if (walletsGroup[0].canAddNewAccount) this.showKeyOnboarding = false;
        });
      } else {
        this.showKeyOnboarding = false;
      }
    });
  }

  private showKeyOnboardingSlides(coins: Coin[]) {
    this.logger.debug('Showing key onboarding');
    const modal = this.modalCtrl.create(KeyOnboardingPage, null, {
      showBackdrop: false,
      enableBackdropDismiss: false
    });
    modal.present();
    modal.onDidDismiss(() => {
      this.persistenceProvider.setKeyOnboardingFlag();
      this._createWallets(coins);
    });
  }

  public goToCreateWallet(coin: string): void {
    this.navCtrl.push(CreateWalletPage, {
      isShared: this.navParam.data.isShared,
      coin,
      keyId: this.navParam.data.keyId,
      showKeyOnboarding: this.showKeyOnboarding
    });
  }

  public getCoinName(coin: Coin): string {
    return this.currencyProvider.getCoinName(coin);
  }

  public goToImportWallet(): void {
    this.navCtrl.push(ImportWalletPage);
  }

  private _createWallets(coins: Coin[]): void {
    const selectedCoins = _.keys(_.pickBy(this.coinsSelected)) as Coin[];
    coins = coins || selectedCoins;
    const selectedTokens = _.keys(_.pickBy(this.tokensSelected));
    this.onGoingProcessProvider.set('creatingWallet');
    this.profileProvider
      .createMultipleWallets(coins, selectedTokens)
      .then(wallets => {
        this.walletProvider.updateRemotePreferences(wallets);
        this.pushNotificationsProvider.updateSubscription(wallets);
        this.profileProvider.setNewWalletGroupOrder(
          wallets[0].credentials.keyId
        );
        this.endProcess();
      })
      .catch(e => {
        this.showError(e);
      });
  }

  public createWallets(coins: Coin[]): void {
    if (this.showKeyOnboarding) {
      // this.showKeyOnboardingSlides(coins);
      // return;
    } else if (this.isZeroState) {
      this.showInfoSheet(coins);
      return;
    }
    this._createWallets(coins);
  }

  private showError(err) {
    this.onGoingProcessProvider.clear();
    this.logger.error('Create: could not create wallet', err);
    const title = this.translate.instant('Error');
    err = this.bwcErrorProvider.msg(err);
    this.errorsProvider.showDefaultError(err, title);
  }

  private endProcess() {
    this.onGoingProcessProvider.clear();
    // using setRoot(TabsPage) as workaround when coming from settings
    this.app
      .getRootNavs()[0]
      .setRoot(TabsPage)
      .then(() => {
        this.app
          .getRootNav()
          .getActiveChildNav()
          .select(1);
        this.events.publish('Local/WalletListChange');
      });
  }

  public createAndBindTokenWallet(pairedWallet, token) {
    if (!_.isEmpty(pairedWallet)) {
      this.profileProvider.createTokenWallet(pairedWallet, token).then(() => {
        // store preferences for the paired eth wallet
        this.walletProvider.updateRemotePreferences(pairedWallet);
        this.endProcess();
      });
    }
  }

  private viewWalletsError(message: string): void {
    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title:
        '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
      message,
      buttons: [
        {
          text: 'Ok'
        }
      ]
    });
    alert.present();
  }

  public showPairedWalletSelector(token) {
    let eligibleWallets = this.navParam.data.keyId
      ? this.profileProvider.getWalletsFromGroup({
          keyId: this.navParam.data.keyId,
          network: 'livenet',
          pairFor: token
        })
      : [];
 
    const blockchainName = (token.blockchain === 'ducx') 
      ? 'DucatusX'
      : 'Ethereum';
   
    let correctWallets = eligibleWallets.filter(
      wallet => wallet.coin === token.blockchain
    );

    if (correctWallets.length === 0) {
      this.viewWalletsError(`${blockchainName} Wallet required`);
      return;
    } else {
      const currentWallets = eligibleWallets.filter(
        wallet => wallet.coin === token.symbol.toLowerCase()
      );
      if (currentWallets.length) {
        currentWallets.forEach(wallet => {
          correctWallets = correctWallets.filter(
            eWallet => eWallet.id !== wallet.linkedEthWallet
          );
        });
        if (correctWallets.length) {
          eligibleWallets = correctWallets;
        } else {
          this.viewWalletsError(
            ` No suitable ${blockchainName} wallet detected, please create a new one`
          );
          return;
        }
      } else {
        eligibleWallets = correctWallets;
      }
    }

    const walletSelector = this.actionSheetProvider.createInfoSheet(
      'addTokenWallet',
      {
        wallets: eligibleWallets,
        token,
        blockchainName
      }
    );
    walletSelector.present();
    walletSelector.onDidDismiss(pairedWallet => {
      return this.createAndBindTokenWallet(pairedWallet, token);
    });
  }
  public setTokens(coin?: string): void {
    if (coin === 'eth' || !coin) {
      for (const token of this.availableTokens) {
        if (this.isZeroState) {
          this.tokensSelected[token.symbol] = false;
        } else {
          let canCreateit = _.isEmpty(
            this.profileProvider.getWalletsFromGroup({
              keyId: this.navParam.data.keyId,
              network: 'livenet',
              pairFor: token
            })
          );
          this.tokenDisabled[token.symbol] = canCreateit;
        }
      }
    }
  }

  private showInfoSheet(coins: Coin[]) {
    const infoSheet = this.actionSheetProvider.createInfoSheet('new-key');
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        this.showKeyOnboardingSlides(coins);
        return;
      }
      this._createWallets(coins);
    });
  }
}
