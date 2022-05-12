import { Component } from '@angular/core';
import { StatusBar } from '@ionic-native/status-bar';
import { NavParams } from 'ionic-angular';
import { Logger } from '../../../providers/logger/logger';

// Native
import { SocialSharing } from '@ionic-native/social-sharing';

// providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ConfigProvider } from '../../../providers/config/config';
import { Coin, CurrencyProvider } from '../../../providers/currency/currency';
import { PlatformProvider } from '../../../providers/platform/platform';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import { WalletProvider } from '../../../providers/wallet/wallet';

@Component({
  selector: 'page-custom-amount',
  templateUrl: 'custom-amount.html'
})
export class CustomAmountPage {
  public protocolHandler: string;
  public address: string;
  public qrAddress: string;
  public wallet: any = {};
  public showShareButton: boolean;
  public amountUnitStr: string;
  public amountCoin: string;
  public useLegacyQrCode: boolean;
  public altAmountStr: string;

  constructor(
    public currencyProvider: CurrencyProvider,
    private navParams: NavParams,
    private profileProvider: ProfileProvider,
    private platformProvider: PlatformProvider,
    private walletProvider: WalletProvider,
    private logger: Logger,
    private socialSharing: SocialSharing,
    private txFormatProvider: TxFormatProvider,
    private actionSheetProvider: ActionSheetProvider,
    private statusBar: StatusBar,
    private configProvider: ConfigProvider
  ) {
    const walletId = this.navParams.data.walletId;
    this.showShareButton = this.platformProvider.isCordova;
    this.useLegacyQrCode = this.configProvider.get().legacyQrCode.show;
    this.wallet = this.profileProvider.getWallet(walletId);

    this.walletProvider.getAddress(this.wallet, false).then(addr => {
      this.address = this.walletProvider.getAddressView(
        this.wallet.coin,
        this.wallet.network,
        addr
      );

      const parsedAmount = this.txFormatProvider.parseAmount(
        this.wallet.coin,
        this.navParams.data.amount,
        this.navParams.data.currency
      );

      // Amount in USD or BTC
      const _amount = parsedAmount.amount;
      const _currency = parsedAmount.currency;
      this.amountUnitStr = parsedAmount.amountUnitStr;

      if (!Coin[_currency]) {
        // Convert to BTC or BCH
        const amountUnit = this.txFormatProvider.satToUnit(
          parsedAmount.amountSat,
          this.wallet.coin
        );
        var btcParsedAmount = this.txFormatProvider.parseAmount(
          this.wallet.coin,
          amountUnit,
          this.wallet.coin.toUpperCase()
        );

        this.amountCoin = btcParsedAmount.amount;
        this.altAmountStr = btcParsedAmount.amountUnitStr;
      } else {
        this.amountCoin = _amount; // BTC or BCH
        this.altAmountStr = this.txFormatProvider.formatAlternativeStr(
          this.wallet.coin,
          parsedAmount.amountSat
        );
      }

      let protoAddr;
      if (this.wallet.coin != 'bch') {
        protoAddr = this.walletProvider.getProtoAddress(
          this.wallet.coin,
          this.wallet.network,
          this.address
        );
      }

      if (
        this.currencyProvider.isUtxoCoin(this.wallet.coin) ||
        this.wallet.coin === 'xrp'
      ) {
        this.qrAddress =
          (protoAddr ? protoAddr : this.address) + '?amount=' + this.amountCoin;
      } else {
        this.qrAddress =
          (protoAddr ? protoAddr : this.address) +
          '?value=' +
          parsedAmount.amountSat;
      }
    });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: CustomAmountPage');
  }

  ionViewWillEnter() {
    if (this.platformProvider.isIOS) {
      this.statusBar.styleDefault();
    }
  }

  public shareAddress(): void {
    this.socialSharing.share(this.qrAddress);
  }

  public showFullInfo(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'custom-amount',
      {
        qrAddress: this.qrAddress
      }
    );
    infoSheet.present();
  }

  public showPaymentRequestInfo(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'payment-request',
      {
        amount: this.amountUnitStr,
        name: this.wallet.name
      }
    );
    infoSheet.present();
  }
}
