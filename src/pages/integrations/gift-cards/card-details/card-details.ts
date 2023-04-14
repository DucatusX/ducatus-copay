import {
  animate,
  query,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {
  ActionSheetProvider,
  InfoSheetType
} from '../../../../providers/action-sheet/action-sheet';
import { ConfettiProvider } from '../../../../providers/confetti/confetti';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import {
  CardConfig,
  ClaimCodeType,
  GiftCard
} from '../../../../providers/gift-card/gift-card.types';
import { PlatformProvider } from '../../../../providers/platform/platform';
import { PrintableCardComponent } from './printable-card/printable-card';
@Component({
  selector: 'card-details-page',
  templateUrl: 'card-details.html',
  animations: [
    trigger('enterAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms 250ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('400ms 250ms ease', style({ opacity: 0 }))
      ])
    ]),
    trigger('preventInitialChildAnimations', [
      transition(':enter', [query(':enter', [], { optional: true })])
    ])
  ]
})
export class CardDetailsPage {
  public card: GiftCard;
  public cardConfig: CardConfig;
  public barcodeData: string;
  public barcodeFormat: string;
  ClaimCodeType = ClaimCodeType;

  @ViewChild(PrintableCardComponent)
  printableCard: PrintableCardComponent;

  @ViewChild('confetti') confetti: ElementRef;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private confettiProvider: ConfettiProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private nav: NavController,
    public navParams: NavParams,
    private platformProvider: PlatformProvider
  ) {}

  async ngOnInit() {
    this.card = this.navParams.get('card');
    this.barcodeData = this.card.barcodeData || this.card.claimCode;
    this.barcodeFormat = getBarcodeFormat(this.card.barcodeFormat);
    // this.cardConfig = await this.giftCardProvider.getCardConfig(this.card.name);
    // this.updateGiftCard();
  }

  ionViewWillEnter() {
    // this.events.subscribe('bwsEvent', this.bwsEventHandler);
    this.navParams.get('showConfetti') && this.showConfetti();
  }

  showConfetti() {
    this.confettiProvider.confetti(this.confetti.nativeElement);
  }

  ionViewWillLeave() {
    // this.events.unsubscribe('bwsEvent', this.bwsEventHandler);
  }

  // private bwsEventHandler: any = (_, type: string) => {
  //   if (type == 'NewBlock') {
  //     this.updateGiftCard();
  //   }
  // };

  // updateGiftCard() {
  //   this.giftCardProvider
  //     .updatePendingGiftCards([this.card])
  //     .pipe(take(1))
  //     .subscribe(card => (this.card = card));
  // }

  doRefresh(refresher) {
    // this.updateGiftCard();
    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }

  copyCode(code: string) {
    this.actionSheetProvider
      .createInfoSheet('copied-gift-card-claim-code', {
        cardConfig: this.cardConfig,
        claimCode: code
      })
      .present();
  }

  showClaimLinkUI() {
    return (
      this.cardConfig &&
      this.card &&
      (this.cardConfig.defaultClaimCodeType === 'link' ||
        !this.card.claimCode) &&
      this.card.status === 'SUCCESS'
    );
  }

  showBarcode() {
    return (
      this.cardConfig &&
      this.cardConfig.defaultClaimCodeType === ClaimCodeType.barcode
    );
  }

  hasPin() {
    const legacyCards: string[] = [
      'Amazon.com',
      'Amazon.co.jp',
      'Mercado Livre'
    ];
    const shouldHidePin = this.cardConfig && this.cardConfig.hidePin;
    const pin = this.card && this.card.pin;
    return !shouldHidePin && pin && legacyCards.indexOf(this.card.name) === -1
      ? true
      : false;
  }

  showInfoSheet(
    sheetName: InfoSheetType,
    onDidDismiss: (confirm?: boolean) => void = () => {}
  ) {
    const sheet = this.actionSheetProvider.createInfoSheet(sheetName);
    sheet.present();
    sheet.onDidDismiss(confirm => {
      if (confirm) {
        onDidDismiss(confirm);
      }
    });
  }

  openExternalLink(url: string): void {
    this.externalLinkProvider.open(url);
  }

  redeem() {
    const redeemUrl = `${this.cardConfig.redeemUrl}${this.card.claimCode}`;
    this.redeemWithUrl(redeemUrl);
  }

  redeemWithUrl(redeemUrl: string) {
    this.externalLinkProvider.open(redeemUrl);
  }

  viewRedemptionCode() {
    this.externalLinkProvider.open(this.card.claimLink);
  }

  showInvoice() {
    this.externalLinkProvider.open(this.card.invoiceUrl);
  }

  showMoreOptions() {
    const showShare =
      this.platformProvider.isCordova &&
      (this.card.claimLink || this.card.claimCode);
    const hidePrint = !this.card.claimLink && this.platformProvider.isAndroid;
    const sheet = this.actionSheetProvider.createOptionsSheet(
      'gift-card-options',
      {
        card: this.card,
        hidePrint,
        showShare
      }
    );
    sheet.present();
    sheet.onDidDismiss(data => {
      switch (data) {
        case 'archive':
          return false;
        case 'unarchive':
          return false;
        case 'view-invoice':
          return this.showInvoice();
      }
    });
  }
  close() {
    this.nav.pop();
  }
}

function getBarcodeFormat(barcodeFormat: string = '') {
  const lowercaseFormats = ['pharmacode', 'codabar'];
  const supportedFormats = [
    'CODE128',
    'CODE128A',
    'CODE128B',
    'CODE128C',
    'EAN',
    'UPC',
    'EAN8',
    'EAN5',
    'EAN2',
    'CODE39',
    'ITF14',
    'MSI',
    'MSI10',
    'MSI11',
    'MSI1010',
    'MSI1110',
    'QR',
    ...lowercaseFormats
  ];
  const normalizedFormat = lowercaseFormats.includes(
    barcodeFormat.toLowerCase()
  )
    ? barcodeFormat.toLowerCase()
    : barcodeFormat.replace(/\s/g, '').toUpperCase();
  return supportedFormats.includes(normalizedFormat)
    ? normalizedFormat
    : 'CODE128';
}
