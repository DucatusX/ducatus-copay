import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as _ from 'lodash';
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { Logger } from "../../../providers";
import { ActionSheetProvider } from "../../../providers/action-sheet/action-sheet";
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { ProfileProvider } from "../../../providers/profile/profile";
import { StakeProvider } from "../../../providers/stake/stake";
import { WalletProvider } from "../../../providers/wallet/wallet";

@Component({
  selector: 'page-stake-add',
  templateUrl: 'stake-add.html'
})

export class StakeAddPage {
  public walletsGroups = [];
  public wallets = [];
  public stakeGroup: FormGroup;
  public selectJwanAddress: string = "0x6d311F0fE811d5E053e19D349e28A13760fB0a62"; // TODO УБРАТЬ ХАРДКОД НАХУЙ И ДИНАМИЧЕСКИ СМОТРЕТЬ ВЫБРАННЫЙ АДРЕС
  public selectWallet;
  public inputAmountValue: number = 100;
  public isApprove: boolean = false;
  public depositLoading: boolean = false;
  public walletAddresses = [];
  public depositPercent: string = "4";
  public depositMonth: string = "12";
  public txp;
  public maxAmount;
  public approveLoading: boolean = false;
  public stakeLoading: boolean = false;
  public approveCheckInterval;

  constructor(
    private stakeProvider: StakeProvider,
    private profileProvider: ProfileProvider, 
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private formBuilder: FormBuilder,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private logger: Logger
  ) {
      this.stakeGroup = this.formBuilder.group({
        address: [
          '',
          Validators.compose([Validators.minLength(34), Validators.required])
        ],
        amount: [
          '',
          Validators.compose([
            Validators.minLength(1),
            Validators.required,
            Validators.min(0)
          ])
        ],
      });


    this.stakeGroup.get("amount").valueChanges
      .pipe(
        debounceTime(200), 
        distinctUntilChanged()
      )
      .subscribe( amount => {
        this.setIsApprove(amount);
    });
  }

  public async ngOnInit(): Promise<void> {
    const wallets = this.profileProvider.getWallets({ showHidden: true });
    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );
    this.wallets = await this.getWalletsInfoAddress('jwan');
    this.setIsApprove(this.inputAmountValue);
  }

  public setIsApprove(amountInput): void {
    if(!amountInput || !this.selectWallet.address) return;

    const amountInputWei = this.stakeProvider.toWei(String(amountInput));

    this.stakeProvider.getApproveAmount(this.selectWallet.address)
    .then((amount) => {
      if(amountInputWei == amount) {
        this.isApprove = true;
        this.approveLoading = false;
        this.stopApproveInterval();
      }
      else {
        this.isApprove = false;
      }

    })
    .catch(err => {
      this.logger.debug(err);
    });
  }
  

  public async ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({
      showHidden: true,
      backedUp: true
    });

    const coinWallets: any = await this.walletProvider.getWalletsByCoin(wallets, 'jwan');

    this.walletAddresses = coinWallets.wallets;
  }

  public approve() {
    this.approveLoading = true;
    this.txp = this.stakeProvider.approve(this.stakeGroup.value.amount, this.selectWallet.walletId)
      .then( () => {
        this.approveLoading = true;
        this.onGoingProcessProvider.clear();
        this.startApproveInterval();
      })
      .catch( () => {
        this.approveLoading = false;
        this.onGoingProcessProvider.clear();
      });
  }

  public stopApproveInterval() {
    if (this.approveCheckInterval) {
      clearInterval(this.approveCheckInterval);
    }
  }

  public startApproveInterval() {
    this.approveCheckInterval = setInterval(() => {
      this.setIsApprove(this.stakeGroup.value.amount);
    }, 1000);
  }

  public stake() {
    this.stakeLoading = true;

    this.stakeProvider.deposit(this.stakeGroup.value.amount, this.selectWallet.walletId)
    .then( () => {
      this.onGoingProcessProvider.clear();
      this.stakeLoading = false;
    })
    .catch( () => {
      this.onGoingProcessProvider.clear();
      this.stakeLoading = false;
    });
  }

  public async sendMax(): Promise<void> {
    const { token } = this.selectWallet.wallet.credentials;
    const tokenAddress = token && token.address || '';
    const amount = await this.walletProvider.getBalance(this.selectWallet.wallet, { tokenAddress });

    this.maxAmount = amount.availableAmount / 100000000;
    this.stakeGroup
      .get('amount')
      .setValue( this.maxAmount, { emitEvent: false });
  }

  public openAddressList(): void {

    if ( !this.depositLoading ) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();

      infoSheet.onDidDismiss((option, item) => {
        if (option) {
          this.stakeGroup.value.address = option;
          // this.useSendMax = false;
          this.selectWallet = item;
        }
      });
    }
  }

  private async getWalletsInfoAddress(coin: string): Promise<any> {
    let coins = [];
    const wallets = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    for ( let i = 0; i < coins.length; i++ ) {
      const coin = coins[i];
      let address: string;

      try {
        address = await this.walletProvider.getAddress(coin, false);
      }
      catch {
       address = '';
      }

      wallets.push({ 
        wallet: coin, 
        address 
      });
    }

    return wallets;
  }

}