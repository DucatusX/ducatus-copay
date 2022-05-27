import { ComponentRef, Injectable } from '@angular/core';
import { ActionSheetParent } from '../../components/action-sheet/action-sheet-parent';
import { ChooseFeeLevelComponent } from '../../components/choose-fee-level/choose-fee-level';
import { EmailComponent } from '../../components/email-component/email-component';
import { IncomingDataMenuComponent } from '../../components/incoming-data-menu/incoming-data-menu';
import { InfoSheetComponent } from '../../components/info-sheet/info-sheet';
import { MemoComponent } from '../../components/memo-component/memo-component';
import { OptionsSheetComponent } from '../../components/options-sheet/options-sheet';
import { WalletReceiveComponent } from '../../components/wallet-receive/wallet-receive';
import { WalletSelectorComponent } from '../../components/wallet-selector/wallet-selector';
import { WalletTabOptionsComponent } from '../../components/wallet-tab-options/wallet-tab-options';
import { Coin } from '../../providers/currency/currency';
import { DomProvider } from '../../providers/dom/dom';

export type InfoSheetType =
  | 'activation-fee-included'
  | 'address-copied'
  | 'addTokenWallet'
  | 'archive-all-gift-cards'
  | 'archive-gift-card'
  | 'appreciate-review'
  | 'backup-failed'
  | 'backup-needed-with-activity'
  | 'backup-ready'
  | 'backup-later-warning'
  | 'convertor-address'
  | 'backup-safeguard-warning'
  | 'cant-get-addresses'
  | 'forbidden'
  | 'copayers'
  | 'copy-to-clipboard'
  | 'copied-gift-card-claim-code'
  | 'copied-invoice-url'
  | 'custom-amount'
  | 'default-error'
  | 'gift-card-archived'
  | 'gift-cards-unavailable'
  | 'hide-gift-card-discount-item'
  | 'insufficient-funds'
  | 'import-no-wallet-warning'
  | 'above-maximum-gift-card-amount'
  | 'below-minimum-gift-card-amount'
  | 'legacy-address-info'
  | 'miner-fee'
  | 'miner-fee-notice'
  | 'payment-request'
  | 'print-required'
  | 'sensitive-info'
  | 'in-app-notification'
  | 'request-feature'
  | 'report-issue'
  | 'new-key'
  | 'wducx-select'
  | 'wrong-encrypt-password'
  | 'bch-legacy-warning-1'
  | 'bch-legacy-warning-2'
  | 'speed-up-tx'
  | 'speed-up-notice';

export type OptionsSheetType =
  | 'wallet-options'
  | 'gift-card-options'
  | 'incoming-data'
  | 'address-book'
  | 'send-options';

export interface WalletSelectorParams {
  wallets: any[];
  selectedWalletId: string;
  title: string;
}

export interface WalletReceiveParams {
  wallet: any;
}

export interface WalletTabOptionsParams {
  walletsGroups: any;
}

export interface ChooseFeeLevelParams {
  network: string;
  coin: Coin;
  feeLevel: string;
  noSave: boolean;
  customFeePerKB: string;
  feePerSatByte: number;
}
@Injectable()
export class ActionSheetProvider {
  constructor(private domProvider: DomProvider) { }

  public createOptionsSheet(
    type: OptionsSheetType,
    params?
  ): OptionsSheetComponent {
    return this.setupSheet<OptionsSheetComponent>(
      OptionsSheetComponent,
      type,
      params
    ).instance;
  }

  public createIncomingDataMenu(params?): IncomingDataMenuComponent {
    return this.setupSheet<IncomingDataMenuComponent>(
      IncomingDataMenuComponent,
      null,
      params
    ).instance;
  }

  public createInfoSheet(type: InfoSheetType, params?): InfoSheetComponent {
    return this.setupSheet<InfoSheetComponent>(InfoSheetComponent, type, params)
      .instance;
  }

  public createMemoComponent(memo): MemoComponent {
    return this.setupSheet<MemoComponent>(MemoComponent, null, { memo })
      .instance;
  }

  public createEmailComponent(): EmailComponent {
    return this.setupSheet<EmailComponent>(EmailComponent).instance;
  }

  public createWalletSelector(
    params: WalletSelectorParams
  ): WalletSelectorComponent {
    return this.setupSheet<WalletSelectorComponent>(
      WalletSelectorComponent,
      null,
      params
    ).instance;
  }

  public createWalletReceive(
    params: WalletReceiveParams
  ): WalletReceiveComponent {
    return this.setupSheet<WalletReceiveComponent>(
      WalletReceiveComponent,
      null,
      params
    ).instance;
  }

  public createChooseFeeLevel(
    params: ChooseFeeLevelParams
  ): ChooseFeeLevelComponent {
    return this.setupSheet<ChooseFeeLevelComponent>(
      ChooseFeeLevelComponent,
      null,
      params
    ).instance;
  }

  public createWalletTabOptions(
    params: WalletTabOptionsParams
  ): WalletTabOptionsComponent {
    return this.setupSheet<WalletTabOptionsComponent>(
      WalletTabOptionsComponent,
      null,
      params
    ).instance;
  }

  private setupSheet<T extends ActionSheetParent>(
    componentType: { new(...args): T },
    sheetType?: string,
    params?
  ): ComponentRef<T> {
    const sheet = this.domProvider.appendComponentToBody<T>(componentType);
    sheet.instance.componentRef = sheet;
    sheet.instance.sheetType = sheetType;
    sheet.instance.params = params;
    return sheet;
  }
}
