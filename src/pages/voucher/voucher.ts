import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BwcProvider } from '../../providers/bwc/bwc';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { Logger, ProfileProvider, WalletProvider } from '../../providers';
import { VOUCHER_URL_REQUEST } from './params';

// const bip65 = require('bip65');
// const bitcoin = require('bitcoinjs-lib');
const freeze = require('./freeze.js');

// import * as bitcoin from 'bitcoinjs-lib';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  public vouchersLoading = true;
  public vouchers = [];
  public keys = [];
  public wallets: any;
  public walletsKey = [];
  public walletsGroups: any;
  public addressHardcode: string;

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private httpClient: HttpClient,
    private bwcProvider: BwcProvider
  ) {}

  ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.keyId)) walletsResult.push(res.keyId);
      });

      console.log('wallets', wallets);
      console.log('walletsResult', walletsResult);

      this.httpClient
        .get(
          `${VOUCHER_URL_REQUEST}get_frozen_vouchers/?wallet_ids=${walletsResult}`
        )
        .toPromise()
        .then(result => {
          this.vouchers = result as any;
          this.logger.log('vouchers original:', this.vouchers);

          this.vouchers.map(x => {
            x.freez_date = new Date(x.cltv_details.lock_time * 1000);
            x.freez_date_count = Math.ceil(
              Math.abs(x.freez_date.getTime() - new Date().getTime()) /
                (1000 * 3600 * 24)
            );
            x.withdrow_check = false;
          });

          this.vouchersLoading = false;
          this.logger.log('vouchers:', this.vouchers);
        })
        .catch(err => this.logger.debug(err));
    });
  }

  private getAddress(wallet) {
    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        this.addressHardcode = addr;
        return resolve(addr);
      });
    });
  }

  private getWalletsInfo(coin): Promise<any> {
    return new Promise(resolve => {
      let coins = [];
      let wallets = [];

      this.walletsGroups.forEach(keyID => {
        coins = _.concat(
          coins,
          keyID.filter(wallet => wallet.coin === coin.toLowerCase())
        );
      });

      wallets = coins.map(wallet => {
        return {
          keyId: wallet.keyId,
          requestPubKey: wallet.credentials.requestPubKey,
          wallet,
          address: this.getAddress(wallet)
        };
      });

      resolve(wallets);
    });
  }

  private getVoucher(id) {
    return this.httpClient
      .get(`${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`)
      .toPromise();
  }

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
  }

  public withdrowTrigger(id: number) {
    this.getVoucher(id).then(res => {
      const voucher: any = res;

      voucher.cltv_details.sending_amount =
        voucher.voucherinput_set[0].amount - voucher.tx_fee;
      voucher.cltv_details.tx_hash = voucher.voucherinput_set[0].mint_tx_hash;
      voucher.cltv_details.user_duc_address = voucher.user_duc_address;
      voucher.cltv_details.vout_number = voucher.voucherinput_set[0].tx_vout;

      console.log(voucher);

      // const hashType = bitcoin.Transaction.SIGHASH_ALL;
      // const network = bitcoin.networks.bitcoin;

      // network.bip32.public = 0x019da462;
      // network.bip32.private = 0x019d9cfe;
      // network.pubKeyHash = 0x31;
      // network.scriptHash = 0x33;
      // network.wif = 0xb1;

      // getting privateKey

      this.getWalletsInfo('duc').then(wallets => {
        wallets.map(res => {
          let wallet: any;

          // const ducatuscore = this.bwcProvider.getDucatuscore();

          res.address.then(res1 => {
            if (res1 === voucher.cltv_details.user_duc_address) {
              wallet = res.wallet;
              // const walletPublicKey = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
              //   wallet.credentials.xPubKey
              // );

              // console.log('walletPublicKey', walletPublicKey);

              console.log(wallet);

              // let walletPrivKey = this.bwcProvider.Client.Ducatuscore.HDPublicKey(
              //   wallet.credentials.requestPrivKey
              // );

              // console.log('walletPrivKey', walletPrivKey);
              // console.log('walletPrivKey toWIF', walletPrivKey.toWIF());

              freeze.makeFreeze(
                'TJYbxzCnVf4gyvCBTgAEjk9UhHG2wjTWTE8aoUCd9wwtipZZ53Xw',
                voucher.cltv_details
              );
            }
          });
        });
      });

      // const keyPairAlice0 = bitcoin.ECPair.fromWIF(
      //   'TJW3M7VHfjEu3SoUCmYrg4JDDM6DvqPEDQsaSF3dsjnqN6ViQrp5',
      //   network
      // );

      // console.log('keyPairAlice0:', keyPairAlice0);

      // var lockTime = bip65.encode({
      //   utc: voucher.lock_time
      // });

      // console.log('lockTime:', lockTime);

      // const txb = new bitcoin.TransactionBuilder(network);
      // console.log('txb 1:', txb);

      // txb.setVersion(1);
      // // txb.__TX.version = 1;
      // txb.setLockTime(lockTime);

      // console.log('txb 2:', txb);

      // // вход, который собираемся потратить, и его vout, последний параметр не трогать
      // // посмотреть непотраченные входы на адресе можно тут: https://ducapi.rocknblock.io/api/DUC/mainnet/address/
      // txb.addInput(voucher.tx_hash, voucher.vout_number, 0xfffffffe);

      // console.log('txb 3:', txb);

      // console.log(
      //   'Buffer.from(voucher.sending_amount).toString("hex"):',
      //   Buffer.from(voucher.sending_amount).toString('hex'),
      //   Number(Buffer.from(voucher.sending_amount).toString('hex'))
      // );

      // // адрес, куда отправить заблокированные монеты и сумма в hex
      // txb.addOutput(
      //   voucher.user_duc_address,
      //   Number(Buffer.from(voucher.sending_amount).toString('hex'))
      // );

      // console.log('txb 4:', txb);

      // const tx = txb.buildIncomplete();

      // console.log('tx:', tx);

      // console.log(
      //   'Buffer.from(voucher.sending_amount).toString(hex):',
      //   Buffer.from(voucher.sending_amount).toString('hex')
      // );

      // const signatureHash = tx.hashForSignature(
      //   0,
      //   Buffer.from(voucher.redeem_script, 'hex'),
      //   hashType
      // );

      // console.log('signatureHash:', signatureHash);

      // const inputScriptFirstBranch = bitcoin.payments.p2sh({
      //   redeem: {
      //     input: bitcoin.script.compile([
      //       bitcoin.script.signature.encode(
      //         keyPairAlice0.sign(signatureHash),
      //         hashType
      //       ),
      //       bitcoin.opcodes.OP_TRUE
      //     ]),
      //     output: voucher.redeem_script
      //   }
      // }).input;

      // console.log('inputScriptFirstBranch:', inputScriptFirstBranch);
    });
  }
}
