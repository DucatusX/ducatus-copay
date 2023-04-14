import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';

// Providers
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../providers/address/address';
import { AppProvider } from '../../providers/app/app';
import { Coin, CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { IncomingDataProvider } from '../../providers/incoming-data/incoming-data';
import { Logger } from '../../providers/logger/logger';
import { PayproProvider } from '../../providers/paypro/paypro';
import { ProfileProvider } from '../../providers/profile/profile';

// Pages
import { CopayersPage } from '../add/copayers/copayers';
import { ImportWalletPage } from '../add/import-wallet/import-wallet';
import { JoinWalletPage } from '../add/join-wallet/join-wallet';
import { FreezeAddPage } from '../freeze/freeze-add/freeze-add';
import { BitPayCardIntroPage } from '../integrations/bitpay-card/bitpay-card-intro/bitpay-card-intro';
import { CoinbasePage } from '../integrations/coinbase/coinbase';
import { SelectInvoicePage } from '../integrations/invoice/select-invoice/select-invoice';
import { ShapeshiftPage } from '../integrations/shapeshift/shapeshift';
import { SimplexPage } from '../integrations/simplex/simplex';
import { PaperWalletPage } from '../paper-wallet/paper-wallet';
import { ScanPage } from '../scan/scan';
import { AddressbookAddPage } from '../settings/addressbook/add/add';
import { WalletDetailsPage } from '../wallet-details/wallet-details';
import { AmountPage } from './amount/amount';
import { ConfirmPage } from './confirm/confirm';
import { MultiSendPage } from './multi-send/multi-send';
import { SelectInputsPage } from './select-inputs/select-inputs';

@Component({
  selector: 'page-send',
  templateUrl: 'send.html'
})
export class SendPage {
  public wallet: any;
  public token: any;
  public search: string = '';
  public hasWallets: boolean;
  public invalidAddress: boolean;
  private validDataTypeMap: string[] = [
    'BitcoinAddress',
    'DucatusAddress',
    'BitcoinCashAddress',
    'EthereumAddress',
    'EthereumUri',
    'RippleAddress',
    'RippleUri',
    'BitcoinUri',
    'BitcoinCashUri',
    'DucatusUri',
    'BitPayUri',
    'DucatusXUri'
  ];
  private pageMap = {
    AddressbookAddPage,
    AmountPage,
    BitPayCardIntroPage,
    CoinbasePage,
    ConfirmPage,
    CopayersPage,
    ImportWalletPage,
    JoinWalletPage,
    PaperWalletPage,
    ShapeshiftPage,
    SimplexPage,
    SelectInvoicePage,
    WalletDetailsPage
  };

  constructor(
    private currencyProvider: CurrencyProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private payproProvider: PayproProvider,
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private incomingDataProvider: IncomingDataProvider,
    private addressProvider: AddressProvider,
    private events: Events,
    private actionSheetProvider: ActionSheetProvider,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private errorsProvider: ErrorsProvider
  ) {
    this.wallet = this.navParams.data.wallet;
    this.token = this.navParams.data.token || false;

    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.subscribe('SendPageRedir', this.SendPageRedirEventHandler);
  }

  @ViewChild('transferTo')
  transferTo;

  ionViewDidLoad() {
    this.logger.info('Loaded: SendPage');
  }

  ionViewWillEnter() {
    this.hasWallets = !_.isEmpty(
      this.profileProvider.getWallets({ coin: this.wallet.coin })
    );
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.unsubscribe('SendPageRedir', this.SendPageRedirEventHandler);
  }

  private SendPageRedirEventHandler: any = nextView => {
    nextView.params.fromWalletDetails = true;
    nextView.params.walletId = this.wallet.credentials.walletId;
    nextView.params.token = this.token;
    this.navCtrl.push(this.pageMap[nextView.name], nextView.params);
  };

  private updateAddressHandler: any = data => {
    this.search = data.value;
    this.processInput();
  };

  public shouldShowZeroState() {
    return (
      this.wallet &&
      this.wallet.cachedStatus &&
      !this.wallet.cachedStatus.totalBalanceSat &&
      !this.token
    );
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromSend: true });
  }

  public showOptions(coin: Coin) {
    return (
      this.currencyProvider.isMultiSend(coin) ||
      this.currencyProvider.isUtxoCoin(coin)
    );
  }

  private checkCoinAndNetwork(data, isPayPro?): boolean {
    let isValid, addrData;
    if (isPayPro) {
      isValid =
        data &&
        data.chain == this.currencyProvider.getChain(this.wallet.coin) &&
        data.network == this.wallet.network;
    } else {
      addrData = this.addressProvider.getCoinAndNetwork(
        data,
        this.wallet.network
      );
      const chain = this.currencyProvider
        .getChain(this.wallet.coin)
        .toLowerCase();
      const testCoin = chain === 'ducx' ? 'eth' : chain;
      isValid =
        testCoin == addrData.coin && addrData.network == this.wallet.network;
    }

    if (isValid) {
      this.invalidAddress = false;
      return true;
    } else {
      this.invalidAddress = true;
      let network = isPayPro ? data.network : addrData.network;

      if (this.wallet.coin === 'bch' && this.wallet.network === network) {
        const isLegacy = this.checkIfLegacy();
        isLegacy ? this.showLegacyAddrMessage() : this.showErrorMessage();
      } else {
        this.showErrorMessage();
      }
    }

    return false;
  }

  public redir() {
    this.incomingDataProvider.redir(this.search, {
      activePage: 'SendPage',
      amount: this.navParams.data.amount,
      coin: this.navParams.data.coin // TODO ???? what is this for ?
    });
    this.search = '';
  }

  private showErrorMessage() {
    const msg = this.translate.instant(
      'The wallet you are using does not match the network and/or the currency of the address provided'
    );
    const title = this.translate.instant('Error');
    this.errorsProvider.showDefaultError(msg, title, () => {
      this.search = '';
    });
  }

  private showLegacyAddrMessage() {
    const appName = this.appProvider.info.nameCase;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'legacy-address-info',
      { appName }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        const legacyAddr = this.search;
        const cashAddr = this.addressProvider.translateToCashAddress(
          legacyAddr
        );
        this.search = cashAddr;
        this.processInput();
      }
    });
  }

  public cleanSearch() {
    this.search = '';
    this.invalidAddress = false;
  }

  public async processInput() {
    if (this.search == '') this.invalidAddress = false;
    const hasContacts = await this.checkIfContact();
    if (!hasContacts) {
      const parsedData = this.incomingDataProvider.parseData(this.search);
      if (
        (parsedData && parsedData.type == 'PayPro') ||
        (parsedData && parsedData.type == 'InvoiceUri')
      ) {
        try {
          const invoiceUrl = this.incomingDataProvider.getPayProUrl(
            this.search
          );
          const payproOptions = await this.payproProvider.getPayProOptions(
            invoiceUrl
          );
          const selected = payproOptions.paymentOptions.find(
            option =>
              option.selected &&
              this.wallet.coin.toUpperCase() === option.currency
          );
          if (selected) {
            const isValid = this.checkCoinAndNetwork(selected, true);
            if (isValid) {
              this.incomingDataProvider.goToPayPro(
                payproOptions.payProUrl,
                this.wallet.coin,
                undefined,
                true
              );
            }
          } // else {
          // this.redir();
          // }
        } catch (err) {
          this.invalidAddress = true;
          this.logger.warn(err);
        }
      } else if (
        parsedData &&
        _.indexOf(this.validDataTypeMap, parsedData.type) != -1
      ) {
        const isValid = this.checkCoinAndNetwork(this.search);
        if (isValid) {
          this.invalidAddress = false;
          // this.redir();
        }
      } else if (parsedData && parsedData.type == 'BitPayCard') {
        // this.close();
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else if (parsedData && parsedData.type == 'PrivateKey') {
        this.incomingDataProvider.redir(this.search, {
          activePage: 'SendPage'
        });
      } else {
        this.invalidAddress = true;
      }
    } else {
      this.invalidAddress = false;
    }
  }

  public async checkIfContact() {
    await Observable.timer(50).toPromise();
    return this.transferTo.hasContactsOrWallets;
  }

  private checkIfLegacy(): boolean {
    return (
      this.incomingDataProvider.isValidBitcoinCashLegacyAddress(this.search) ||
      this.incomingDataProvider.isValidBitcoinCashUriWithLegacyAddress(
        this.search
      )
    );
  }

  public showMoreOptions(): void {
    const optionsSheet = this.actionSheetProvider.createOptionsSheet(
      'send-options',
      {
        isUtxoCoin: this.currencyProvider.isUtxoCoin(this.wallet.coin),
        isMultiSend: this.currencyProvider.isMultiSend(this.wallet.coin)
      }
    );
    optionsSheet.present();

    optionsSheet.onDidDismiss(option => {
      if (option == 'multi-send')
        this.navCtrl.push(MultiSendPage, {
          wallet: this.wallet
        });
      if (option == 'select-inputs')
        this.navCtrl.push(SelectInputsPage, {
          wallet: this.wallet
        });
      if (option == 'freeze-3years-send') this.navCtrl.push(FreezeAddPage);
    });
  }
}
