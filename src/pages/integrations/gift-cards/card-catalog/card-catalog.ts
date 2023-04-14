import { Component, ViewChild } from '@angular/core';
// import { NavController } from 'ionic-angular';

// import { BuyCardPage } from '../buy-card/buy-card';

import { TranslateService } from '@ngx-translate/core';
// import { ActionSheetProvider, PlatformProvider } from '../../../../providers';
import { PlatformProvider } from '../../../../providers';
import {
  getDisplayNameSortValue,
  // GiftCardProvider,
  hasVisibleDiscount
} from '../../../../providers/gift-card/gift-card';
import { CardConfig } from '../../../../providers/gift-card/gift-card.types';
import { WideHeaderPage } from '../../../templates/wide-header-page/wide-header-page';

@Component({
  selector: 'card-catalog-page',
  templateUrl: 'card-catalog.html'
})
export class CardCatalogPage extends WideHeaderPage {
  public allCards: CardConfig[];
  public searchQuery: string = '';
  public visibleCards: CardConfig[] = [];
  public cardConfigMap: { [name: string]: CardConfig };

  public getHeaderFn = this.getHeader.bind(this);

  @ViewChild(WideHeaderPage)
  wideHeaderPage: WideHeaderPage;

  constructor(
    // private actionSheetProvider: ActionSheetProvider,
    // public giftCardProvider: GiftCardProvider,
    platormProvider: PlatformProvider,
    // private navCtrl: NavController,
    private translate: TranslateService
  ) {
    super(platormProvider);
  }

  ngOnInit() {
    this.title = 'Gift Cards';
  }

  ionViewWillEnter() {
    // this.giftCardProvider
    //   .getAvailableCards()
    //   .then(allCards => {
    //     this.cardConfigMap = allCards
    //       .sort(sortByFeaturedAndAlphabetically)
    //       .reduce(
    //         (map, cardConfig) => ({ ...map, [cardConfig.name]: cardConfig }),
    //         {}
    //       );
    //     this.allCards = allCards;
    //     this.updateCardList();
    //   })
    //   .catch(_ => {
    //     this.showError();
    //     return [] as CardConfig[];
    //   });
  }

  ionViewDidEnter() {
    // this.logGiftCardCatalogHomeView();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.updateCardList();
  }

  getHeader(record, recordIndex, records) {
    if (record.featured && recordIndex === 0) {
      return this.translate.instant('Featured Brands');
    }
    const prevRecord = records[recordIndex - 1];
    if (
      (!record.featured && prevRecord && prevRecord.featured) ||
      (!record.featured && !prevRecord && this.searchQuery)
    ) {
      return this.translate.instant('More Brands');
    }
    return null;
  }

  trackBy(record) {
    return record.name;
  }

  updateCardList() {
    this.visibleCards = this.allCards.filter(c =>
      isCardInSearchResults(c, this.searchQuery)
    );
  }

  hasPercentageDiscount(cardConfig: CardConfig) {
    return hasVisibleDiscount(cardConfig);
  }
}

export function isCardInSearchResults(c: CardConfig, search: string = '') {
  const cardName = (c.displayName || c.name).toLowerCase();
  const query = search.toLowerCase();
  const matchableText = [cardName, stripPunctuation(cardName)];
  return search && matchableText.some(text => text.indexOf(query) > -1);
}

export function stripPunctuation(text: string) {
  return text.replace(/[^\w\s]|_/g, '');
}

export function sortByFeaturedAndAlphabetically(a: CardConfig, b: CardConfig) {
  return getCatalogSortValue(a) > getCatalogSortValue(b) ? 1 : -1;
}

export function getCatalogSortValue(cardConfig: CardConfig) {
  return `${cardConfig.featured ? 'a' : 'b'}${getDisplayNameSortValue(
    cardConfig.displayName
  )}`;
}
