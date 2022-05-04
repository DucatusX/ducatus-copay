/* Pages */
import { AddWalletPage } from '../pages/add-wallet/add-wallet';
import { AddPage } from '../pages/add/add';
import { CopayersPage } from '../pages/add/copayers/copayers';
import { CreateWalletPage } from '../pages/add/create-wallet/create-wallet';
import { ImportWalletPage } from '../pages/add/import-wallet/import-wallet';
import { JoinWalletPage } from '../pages/add/join-wallet/join-wallet';
import { SelectCurrencyPage } from '../pages/add/select-currency/select-currency';
import { BackupGamePage } from '../pages/backup/backup-game/backup-game';
import { BackupKeyPage } from '../pages/backup/backup-key/backup-key';
import { SwapPage } from '../pages/swap/swap';
import { SwapConvertPage } from '../pages/swap/swap-convert/swap-convert';
import { DepositPage } from '../pages/deposit/deposit';
import { DepositAddPage } from '../pages/deposit/deposit-add/deposit-add';
import { SendFeedbackPage } from '../pages/feedback/send-feedback/send-feedback';
import { FinishModalPage } from '../pages/finish/finish';
import { FreezePage } from '../pages/freeze/freeze';
import { FreezeAddPage } from '../pages/freeze/freeze-add/freeze-add';
import { IntegrationsPage } from '../pages/integrations/integrations';
import { NewDesignTourPage } from '../pages/new-design-tour/new-design-tour';
import { CollectEmailPage } from '../pages/onboarding/collect-email/collect-email';
import { DisclaimerPage } from '../pages/onboarding/disclaimer/disclaimer';
import { OnboardingPage } from '../pages/onboarding/onboarding';
import { PaperWalletPage } from '../pages/paper-wallet/paper-wallet';
import { SlideToAcceptPage } from '../pages/slide-to-accept/slide-to-accept';
import { TabsPage } from '../pages/tabs/tabs';
import { TxDetailsModal } from '../pages/tx-details/tx-details';
import { TxpDetailsPage } from '../pages/txp-details/txp-details';
import { VoucherAddPage } from '../pages/voucher/add/add';
import { VoucherPage } from '../pages/voucher/voucher';
import { SearchTxModalPage } from '../pages/wallet-details/search-tx-modal/search-tx-modal';
import { WalletBalanceModal } from '../pages/wallet-details/wallet-balance/wallet-balance';
import { WalletDetailsPage } from '../pages/wallet-details/wallet-details';
import { NftDetailsPage } from './nft-details/nft-details';

// Integrations: Invoice
import { SelectInvoicePage } from '../pages/integrations/invoice/select-invoice/select-invoice';

// Integrations: Coinbase
import { CoinbasePage } from '../pages/integrations/coinbase/coinbase';
import { CoinbaseAccountPage } from '../pages/integrations/coinbase/coinbase-account/coinbase-account';
import { CoinbaseSettingsPage } from '../pages/integrations/coinbase/coinbase-settings/coinbase-settings';
import { CoinbaseTxDetailsPage } from '../pages/integrations/coinbase/coinbase-tx-details/coinbase-tx-details';
import { CoinbaseWithdrawPage } from '../pages/integrations/coinbase/coinbase-withdraw/coinbase-withdraw';

// Integrations: ShapeShift
import { ShapeshiftPage } from '../pages/integrations/shapeshift/shapeshift';
import { ShapeshiftConfirmPage } from '../pages/integrations/shapeshift/shapeshift-confirm/shapeshift-confirm';
import { ShapeshiftDetailsPage } from '../pages/integrations/shapeshift/shapeshift-details/shapeshift-details';
import { ShapeshiftSettingsPage } from '../pages/integrations/shapeshift/shapeshift-settings/shapeshift-settings';
import { ShapeshiftShiftPage } from '../pages/integrations/shapeshift/shapeshift-shift/shapeshift-shift';

// Integrations: Simplex
import { SimplexPage } from '../pages/integrations/simplex/simplex';
import { SimplexBuyPage } from '../pages/integrations/simplex/simplex-buy/simplex-buy';
import { SimplexDetailsPage } from '../pages/integrations/simplex/simplex-details/simplex-details';
import { SimplexSettingsPage } from '../pages/integrations/simplex/simplex-settings/simplex-settings';

// Integrations: BitPayCard
import { BitPayCardPage } from '../pages/integrations/bitpay-card/bitpay-card';
import { BitPayCardHome } from '../pages/integrations/bitpay-card/bitpay-card-home/bitpay-card-home';
import { BitPayCardIntroPage } from '../pages/integrations/bitpay-card/bitpay-card-intro/bitpay-card-intro';
import { BitPayCardTopUpPage } from '../pages/integrations/bitpay-card/bitpay-card-topup/bitpay-card-topup';
import { BitPaySettingsPage } from '../pages/integrations/bitpay-card/bitpay-settings/bitpay-settings';

// Integrations: BitPayCard - Phases

// Phase 1
import { PhaseOneCardIntro } from '../pages/integrations/bitpay-card/bitpay-card-phases/phase-one/phase-one-intro-page/phase-one-intro-page';

/*Includes */
import { CardItemPage } from '../pages/includes/card-item/card-item';
import { CoinSelectorPage } from '../pages/includes/coin-selector/coin-selector';
import { CreateNewWalletPage } from '../pages/includes/create-new-wallet/create-new-wallet';
import { FeedbackCardPage } from '../pages/includes/feedback-card/feedback-card';
import { GravatarPage } from '../pages/includes/gravatar/gravatar';
import { MultipleOutputsPage } from '../pages/includes/multiple-outputs/multiple-outputs';
import { SurveyCardPage } from '../pages/includes/survey-card/survey-card';
import { TxpPage } from '../pages/includes/txp/txp';

/* Tabs */
import { CardsPage } from '../pages/cards/cards';
import { HomePage } from '../pages/home/home';
import { ScanPage } from '../pages/scan/scan';
import { SendPage } from '../pages/send/send';
import { SettingsPage } from '../pages/settings/settings';
import { WalletsPage } from '../pages/wallets/wallets';

/* Home */
import { ProposalsNotificationsPage } from '../pages/wallets/proposals-notifications/proposals-notifications';

/* Settings */
import { FingerprintModalPage } from '../pages/fingerprint/fingerprint';
import { PIN_COMPONENTS } from '../pages/pin/pin';
import { AboutPage } from '../pages/settings/about/about';
import { SessionLogPage } from '../pages/settings/about/session-log/session-log';
import { AddressbookAddPage } from '../pages/settings/addressbook/add/add';
import { AddressbookPage } from '../pages/settings/addressbook/addressbook';
import { AddressbookViewPage } from '../pages/settings/addressbook/view/view';
import { AdvancedPage } from '../pages/settings/advanced/advanced';
import { AltCurrencyPage } from '../pages/settings/alt-currency/alt-currency';
import { BitPayIdPage } from '../pages/settings/bitpay-id/bitpay-id';
import { FeePolicyPage } from '../pages/settings/fee-policy/fee-policy';
import { LanguagePage } from '../pages/settings/language/language';
import { LockPage } from '../pages/settings/lock/lock';
import { NotificationsPage } from '../pages/settings/notifications/notifications';
import { SharePage } from '../pages/settings/share/share';
import { FeedbackPage } from './settings/feedback/feedback';

/* Wallet Group Settings */
import { ClearEncryptPasswordPage } from '../pages/settings/key-settings/clear-encrypt-password/clear-encrypt-password';
import { ExtendedPrivateKeyPage } from '../pages/settings/key-settings/extended-private-key/extended-private-key';
import { KeyDeletePage } from '../pages/settings/key-settings/key-delete/key-delete';
import { KeyNamePage } from '../pages/settings/key-settings/key-name/key-name';
import { KeyOnboardingPage } from '../pages/settings/key-settings/key-onboarding/key-onboarding';
import { KeyQrExportPage } from '../pages/settings/key-settings/key-qr-export/key-qr-export';
import { KeySettingsPage } from '../pages/settings/key-settings/key-settings';

/* Wallet Settings */
import { WalletDeletePage } from '../pages/settings/wallet-settings/wallet-delete/wallet-delete';
import { WalletNamePage } from '../pages/settings/wallet-settings/wallet-name/wallet-name';
import { WalletSettingsPage } from '../pages/settings/wallet-settings/wallet-settings';
import { WalletMnemonicRecoverPage } from './settings/advanced/wallet-recover-page/wallet-mnemonic-recover-page/wallet-mnemonic-recover-page';
import { WalletRecoverPage } from './settings/advanced/wallet-recover-page/wallet-recover-page';

/* Wallet Advanced Settings */
import { AllAddressesPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-addresses/all-addresses/all-addresses';
import { WalletAddressesPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-addresses/wallet-addresses';
import { WalletDuplicatePage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-duplicate/wallet-duplicate';
import { WalletExportPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-export/wallet-export';
import { WalletInformationPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-information/wallet-information';
import { WalletServiceUrlPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-service-url/wallet-service-url';
import { WalletTransactionHistoryPage } from '../pages/settings/wallet-settings/wallet-settings-advanced/wallet-transaction-history/wallet-transaction-history';

/* Send */
import { AmountPage } from '../pages/send/amount/amount';
import { ConfirmPage } from '../pages/send/confirm/confirm';
import { MultiSendPage } from '../pages/send/multi-send/multi-send';
import { SelectInputsPage } from '../pages/send/select-inputs/select-inputs';
import { TransferToModalPage } from '../pages/send/transfer-to-modal/transfer-to-modal';
import { TransferToPage } from '../pages/send/transfer-to/transfer-to';

/* Receive */
import { CustomAmountPage } from '../pages/receive/custom-amount/custom-amount';
import { WideHeaderPage } from './templates/wide-header-page/wide-header-page';

import { CardCatalogPage } from './integrations/gift-cards/card-catalog/card-catalog';
import { GIFT_CARD_PAGES } from './integrations/gift-cards/gift-cards';

import { Erc721Page } from './erc-721/erc-721';
import { SeedPage } from './seed/seed';

export const PAGES = [
  AddPage,
  AddWalletPage,
  AmountPage,
  AddressbookPage,
  AddressbookAddPage,
  AddressbookViewPage,
  AboutPage,
  AdvancedPage,
  AllAddressesPage,
  AltCurrencyPage,
  BitPayCardHome,
  BitPayCardIntroPage,
  BitPayCardPage,
  BitPaySettingsPage,
  BitPayCardTopUpPage,
  BitPayIdPage,
  CardCatalogPage,
  CreateWalletPage,
  CreateNewWalletPage,
  CoinbaseAccountPage,
  CoinbasePage,
  CoinbaseTxDetailsPage,
  CoinbaseWithdrawPage,
  CopayersPage,
  Erc721Page,
  SeedPage,
  SelectInputsPage,
  FeedbackCardPage,
  SharePage,
  ImportWalletPage,
  IntegrationsPage,
  JoinWalletPage,
  NftDetailsPage,
  BackupGamePage,
  BackupKeyPage,
  SwapPage,
  SwapConvertPage,
  ConfirmPage,
  MultiSendPage,
  TransferToModalPage,
  TransferToPage,
  CustomAmountPage,
  DisclaimerPage,
  CollectEmailPage,
  ...GIFT_CARD_PAGES,
  GravatarPage,
  FingerprintModalPage,
  HomePage,
  CardsPage,
  WalletsPage,
  LanguagePage,
  LockPage,
  MultipleOutputsPage,
  OnboardingPage,
  PaperWalletPage,
  ...PIN_COMPONENTS,
  ProposalsNotificationsPage,
  ScanPage,
  SendPage,
  SettingsPage,
  SelectCurrencyPage,
  SelectInvoicePage,
  CoinbaseSettingsPage,
  ShapeshiftConfirmPage,
  ShapeshiftDetailsPage,
  ShapeshiftSettingsPage,
  ShapeshiftPage,
  ShapeshiftShiftPage,
  SimplexPage,
  SimplexBuyPage,
  SimplexDetailsPage,
  SimplexSettingsPage,
  NotificationsPage,
  FeePolicyPage,
  FeedbackPage,
  SearchTxModalPage,
  SessionLogPage,
  SendFeedbackPage,
  SurveyCardPage,
  FinishModalPage,
  NewDesignTourPage,
  TabsPage,
  TxpDetailsPage,
  TxDetailsModal,
  TxpPage,
  WalletSettingsPage,
  WalletDeletePage,
  WalletNamePage,
  WalletInformationPage,
  WalletAddressesPage,
  WalletExportPage,
  WalletServiceUrlPage,
  WalletTransactionHistoryPage,
  WalletDuplicatePage,
  ExtendedPrivateKeyPage,
  ClearEncryptPasswordPage,
  KeyDeletePage,
  KeyQrExportPage,
  KeySettingsPage,
  KeyNamePage,
  KeyOnboardingPage,
  WalletDetailsPage,
  WalletRecoverPage,
  WalletMnemonicRecoverPage,
  WalletBalanceModal,
  WideHeaderPage,
  VoucherPage,
  VoucherAddPage,
  DepositPage,
  DepositAddPage,
  CardItemPage,
  CoinSelectorPage,
  SlideToAcceptPage, // Phases: card pages
  PhaseOneCardIntro,
  FreezePage,
  FreezeAddPage
];
