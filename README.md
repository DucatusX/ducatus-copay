# Ducatus Wallet 2.0(Copay)

<p align="center">
  <img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/DucatusX/ducatus-copay">
  <a href="https://opensource.org/licenses/MIT/" target="_blank"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-blue.svg" style="display: inherit;"/></a>
  <img alt="GitHub contributors" src="https://img.shields.io/github/contributors/DucatusX/ducatus-copay">
</p>

Ducatus Wallet is a secure ducatus wallet platform for both desktop and mobile devices. 
Ducatus Wallet uses [DucatusCore Wallet Service](https://github.com/DucatusX/ducatus-core/tree/master/packages/ducatus-bitcore-wallet-service) (DWS) 
for peer synchronization and network interfacing.

Ducatus Wallet is fork [Copay](https://github.com/bitpay/wallet).

## Main Features

- Bitcoin and Bitcoin Cash coin support
- Multiple wallet creation and management in-app
- Intuitive, multisignature security for personal or shared wallets
- Easy spending proposal flow for shared wallets and group payments
- [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) Hierarchical deterministic (HD) address generation and wallet backups
- Device-based security: all private keys are stored locally, not in the cloud
- Support for Bitcoin testnet wallets
- Synchronous access across all major mobile and desktop platforms
- Payment protocol (BIP70-BIP73) support: easily-identifiable payment requests and verifiable, secure bitcoin payments
- Support for over 150 currency pricing options and unit denomination in BTC or bits
- Mnemonic (BIP39) support for wallet backups
- Paper wallet sweep support (BIP38)
- Email notifications for payments and transfers
- Push notifications (only available for ios and android versions)
- Multiple languages supported
- Available for [iOS](https://itunes.apple.com/us/app/copay/id951330296), [Android](https://play.google.com/store/apps/details?id=com.bitpay.wallet&hl=en), [Chrome App](https://chrome.google.com/webstore/detail/copay/cnidaodnidkbaplmghlelgikaiejfhja?hl=en)

## Testing in a Browser

> **Note:** This method should only be used for development purposes. When running Ducatus Wallet in a normal browser environment, browser extensions and other malicious code might have access to internal data and private keys. For production use, see the latest official [releases](https://github.com/DucatusX/ducatus-copay/releases).

Clone the repo and open the directory:

```sh
git clone git@github.com:DucatusX/ducatus-copay.git
cd copay
```

Ensure you have [Node](https://nodejs.org/) v10.24.1 installed, then install and start Ducatus Wallet:

```sh
npm install
npm run apply:copay
npm run start
```

Visit [`localhost:8100`](http://localhost:8100/) to view the app.

## Unit & E2E Tests (Karma & Protractor)

To run the tests, run:

```
 npm run test
```

## Testing on Real Devices

It's recommended that all final testing be done on a real device – both to assess performance and to enable features that are unavailable to the emulator (e.g. a device camera).

### Android

Follow the [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) to set up your development environment.

When your development environment is ready, run the `start:android` package script.

```sh
npm run apply:copay
npm run prepare:copay
npm run start:android
```

### iOS

Follow the [Cordova iOS Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/) to set up your development environment.

When your development environment is ready, run the `start:ios` package script.

```sh
npm run apply:copay
npm run prepare:copay
npm run start:ios
```

## Build Copay App Bundles

Before building the release version for a platform, run the `clean-all` command to delete any untracked files in your current working directory. (Be sure to stash any uncommitted changes you've made.) This guarantees consistency across builds for the current state of this repository.

The `final` commands build the production version of the app, and bundle it with the release version of the platform being built.

### Android

```sh
npm run clean-all
npm install
npm run apply:copay
npm run prepare:copay
npm run final:android
```

### iOS

```sh
npm run clean-all
npm install
npm run apply:copay
npm run prepare:copay
npm run final:ios
```


### Web extensions

```sh
  npm i 
  npm run apply:copay
```

#### For Chrome

```sh
  npm run build:chrome-extension
```

#### For Firefox

```sh
  npm run build:firefox-extension
```

### Push Notifications

Push notification doesn't work on iOS 12 due to an update of Xcode and plugin `cordova-plugin-fcm`.

A current workaround is to comment out the line to prevent the removal of the file during the debug build (line 56 in platforms/ios/cordova/lib/copy-www-build-step.js).

[Source](https://github.com/phonegap/phonegap-plugin-push/issues/2518)


## Configuration

### General

Ducatus Wallet implements a multisig wallet using [p2sh](https://en.bitcoin.it/wiki/Pay_to_script_hash) addresses. It supports multiple wallets, each with its own configuration, such as 3-of-5 (3 required signatures from 5 participant peers) or 2-of-3. To create a multisig wallet shared between multiple participants, Ducatus Wallet requires the extended public keys of all the wallet participants. Those public keys are then incorporated into the wallet configuration and combined to generate a payment address where funds can be sent into the wallet. Conversely, each participant manages their own private key and that private key is never transmitted anywhere.

To unlock a payment and spend the wallet's funds, a quorum of participant signatures must be collected and assembled in the transaction. The funds cannot be spent without at least the minimum number of signatures required by the wallet configuration (2-of-3, 3-of-5, 6-of-6, etc.). Once a transaction proposal is created, the proposal is distributed among the wallet participants for each to sign the transaction locally. Finally, when the transaction is signed, the last signing participant will broadcast the transaction to the Bitcoin network.

Ducatus Wallet also implements [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) to generate new addresses for peers. The public key that each participant contributes to the wallet is a BIP32 extended public key. As additional public keys are needed for wallet operations (to produce new addresses to receive payments into the wallet, for example) new public keys can be derived from the participants' original extended public keys. Once again, it's important to stress that each participant keeps their own private keys locally - private keys are not shared - and are used to sign transaction proposals to make payments from the shared wallet.

For more information regarding how addresses are generated using this procedure, see: [Structure for Deterministic P2SH Multisignature Wallets](https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki).

## Ducatus Wallet Backups and Recovery

Ducatus Wallet uses BIP39 mnemonics for backing up wallets. The BIP44 standard is used for wallet address derivation. Multisig wallets use P2SH addresses, while non-multisig wallets use P2PKH.

Information about backup and recovery procedures is available at: https://github.com/bitpay/copay/blob/master/backupRecovery.md

Previous versions of Copay used files as backups. See the following section.

It is possible to recover funds from a Ducatus Wallet without using Copay or the Wallet Service, check the [Copay Recovery Tool](https://github.com/bitpay/copay-recovery/tree/master).

## Wallet Export Format

Ducatus Wallet encrypts the backup with the [Stanford JS Crypto Library](http://bitwiseshiftleft.github.io/sjcl/). To extract the private key of your wallet you can go to settings, choose your wallet, click in "more options", then "wallet information", scroll to the bottom and click in "Extended Private Key". That information is enough to sign any transaction from your wallet, so be careful when handling it!

The backup also contains the key `publicKeyRing` that holds the extended public keys of the Copayers.
Depending on the key `derivationStrategy`, addresses are derived using
[BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) or [BIP45](https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki). Wallets use BIP45. Also note non-multisig wallets use address types Pay-to-PublicKeyHash (P2PKH) while multisig wallets still use Pay-to-ScriptHash (P2SH) (key `addressType` at the backup):

Using a tool like [Bitcore PlayGround](http://bitcore.io/playground) all wallet addresses can be generated. (TIP: Use the `Address` section for P2PKH address type wallets and `Multisig Address` for P2SH address type wallets). For multisig addresses, the required number of signatures (key `m` on the export) is also needed to recreate the addresses.

BIP45 note: All addresses generated at DWS with BIP45 use the 'shared cosigner index' (2147483647) so Copay address indexes look like: `m/45'/2147483647/0/x` for main addresses and `m/45'/2147483647/1/y` for change addresses.

Ducatus Wallet uses the root `m/48'` for hardware multisignature wallets. This was coordinated with Ledger and Trezor teams. While the derivation path format is still similar to BIP44, the root was in order to indicate that these wallets are not discoverable by scanning addresses for funds. Address generation for multisignature wallets requires the other copayers extended public keys.

## DucatusCore Wallet Service

Ducatus Wallet depends on [DucatusCore Wallet Service](https://github.com/DucatusX/ducatus-core/tree/master/packages/ducatus-bitcore-wallet-service) (DWS) for blockchain information, networking and wallet synchronization.

## Release Schedules

Ducatus uses the `MAJOR.MINOR.BATCH` convention for versioning. Any release that adds features should modify the MINOR or MAJOR number.

## License

Ducatus is released under the MIT License. Please refer to the [LICENSE](https://github.com/DucatusX/ducatus-copay/blob/master/LICENSE) file that accompanies this project for more information including complete terms and conditions.


Copyright 2022 Ducatus.