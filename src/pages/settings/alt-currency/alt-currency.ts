import { Component } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen';
import { NavController } from 'ionic-angular';
import * as _ from 'lodash';
import { ConfigProvider } from '../../../providers/config/config';
import { Logger } from '../../../providers/logger/logger';
import { PersistenceProvider } from '../../../providers/persistence/persistence';
import { PlatformProvider } from '../../../providers/platform/platform';

@Component({
  selector: 'page-alt-currency',
  templateUrl: 'alt-currency.html'
})
export class AltCurrencyPage {
  public completeAlternativeList;
  public searchedAltCurrency: string;
  public altCurrencyList;
  public loading;
  public currentCurrency;
  public lastUsedAltCurrencyList;
  private PAGE_COUNTER: number = 3;
  private SHOW_LIMIT: number = 10;
 
  constructor(
    private configProvider: ConfigProvider,
    private logger: Logger,
    private navCtrl: NavController,
    private splashScreen: SplashScreen,
    private platformProvider: PlatformProvider,
    private persistenceProvider: PersistenceProvider
  ) {
    this.completeAlternativeList = [];
    this.altCurrencyList = [];
  }

  ionViewWillEnter() {
    this.completeAlternativeList = [{
      isoCode: 'USD', 
      name: 'US Dollar'
    }];
    this.altCurrencyList = this.completeAlternativeList;
    
    let config = this.configProvider.get();
    this.currentCurrency = config.wallet.settings.alternativeIsoCode;

    this.persistenceProvider
      .getLastCurrencyUsed()
      .then(lastUsedAltCurrency => {
        this.lastUsedAltCurrencyList = lastUsedAltCurrency
          ? lastUsedAltCurrency
          : [];
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  public loadAltCurrencies(loading): void {
    if (this.altCurrencyList.length === this.completeAlternativeList.length) {
      loading.complete();
      return;
    }
    setTimeout(() => {
      this.altCurrencyList = this.completeAlternativeList.slice(
        0,
        this.PAGE_COUNTER * this.SHOW_LIMIT
      );
      this.PAGE_COUNTER++;
      loading.complete();
    }, 300);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: AltCurrencyPage');
  }

  public save(newAltCurrency): void {
    var opts = {
      wallet: {
        settings: {
          alternativeName: newAltCurrency.name,
          alternativeIsoCode: newAltCurrency.isoCode
        }
      }
    };

    this.configProvider.set(opts);
    this.saveLastUsed(newAltCurrency);

    this.navCtrl.popToRoot().then(() => {
      this.reload();
    });
  }

  private reload(): void {
    window.location.reload();
    if (this.platformProvider.isCordova) this.splashScreen.show();
  }

  private saveLastUsed(newAltCurrency): void {
    this.lastUsedAltCurrencyList.unshift(newAltCurrency);
    this.lastUsedAltCurrencyList = _.uniqBy(
      this.lastUsedAltCurrencyList,
      'isoCode'
    );
    this.lastUsedAltCurrencyList = this.lastUsedAltCurrencyList.slice(0, 3);
    this.persistenceProvider
      .setLastCurrencyUsed(JSON.stringify(this.lastUsedAltCurrencyList))
      .then(() => {});
  }

  public findCurrency(searchedAltCurrency: string): void {
    const altCurrencyList = _.filter(this.completeAlternativeList, item => {
      let val = item.name;
      let val2 = item.isoCode;

      return (
        _.includes(val.toLowerCase(), searchedAltCurrency.toLowerCase()) ||
        _.includes(val2.toLowerCase(), searchedAltCurrency.toLowerCase())
      );
    });

    this.altCurrencyList = altCurrencyList;
  }
}
