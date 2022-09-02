import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ModalController ,NavController } from "ionic-angular";
import * as _ from 'lodash';
import { debounceTime, distinctUntilChanged} from "rxjs/operators";
import { FinishModalPage } from "../../../pages/finish/finish";
import { Logger } from "../../../providers";
import { ActionSheetProvider } from "../../../providers/action-sheet/action-sheet";
import { FormControllerProvider } from "../../../providers/form-contoller/form-controller";
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { ProfileProvider } from "../../../providers/profile/profile";
import { StakeProvider } from "../../../providers/stake/stake";
import { WalletProvider } from "../../../providers/wallet/wallet";

@Component({
  selector: 'page-stake-add',
  templateUrl: 'stake-add.html'
})

export class StakeAddPage {
  public defaultReward = "4";
  public walletsGroups = [];
  public wallets = [];
  public stakeGroup: FormGroup;
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
  public reward: string;
  public sumRewards: number;
  public isEmptyInput: boolean = true;

  constructor(
    private stakeProvider: StakeProvider,
    private profileProvider: ProfileProvider, 
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private formBuilder: FormBuilder,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private logger: Logger,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private formlCtrl: FormControllerProvider,
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
        if(amount != '0' && amount != '') {
          const amountInputValid = this.formlCtrl.transformValue(amount);
          this.setIsApprove(amount);
          this.sumRewards = Number(amountInputValid) * Number(this.reward || this.defaultReward);
          this.isEmptyInput = !Boolean(Number(amount));
          this.setAmountInput(amountInputValid);
        }
        else {
          this.isEmptyInput = true;
        }
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
    this.stakeProvider.getPercent().then( rewards =>{
      this.reward = rewards;
    })
    .catch(err => {
      this.logger.debug(err);
      this.reward = this.defaultReward;
    });
  }

  public async createFinishModal() {
    const finishText = this.translate.instant('Transaction broadcasted');
    const finishComment = this.translate.instant('It may take up to 10 minutes for the transaction to be confirmed'); 
    const params = { finishText, finishComment ,autoDismiss: false };

    const modal = this.modalCtrl.create(FinishModalPage, params, {
      showBackdrop: true,
      enableBackdropDismiss: false,
      cssClass: 'finish-modal'
    });
    await modal.present();
  }

  public setIsApprove(amountInput): void {
    if(!amountInput || !this.selectWallet.address) return;

    const amountInputWei = this.stakeProvider.toWei(String(amountInput));

    this.stakeProvider.getApproveAmount(this.selectWallet.address)
    .then((amount) => {
      if(Number(amountInputWei) <= Number(amount)) {
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

  public setAmountInput(amount: string): void {
    this.stakeGroup
    .get('amount')
    .setValue(amount);
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
      .then(() => {
        this.approveLoading = true;
        this.onGoingProcessProvider.clear();
        this.startApproveInterval();
        this.createFinishModal();
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
      this.createFinishModal();
      this.navCtrl.pop();
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