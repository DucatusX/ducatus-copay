import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavController } from 'ionic-angular';
import env from '../../../environments';
import {
  ApiProvider, AppProvider,
  BitPayProvider, ExternalLinkProvider,
  Logger, PersistenceProvider,
  ReplaceParametersProvider
} from '../../../providers';
import { SendFeedbackPage } from '../../feedback/send-feedback/send-feedback';
import { SessionLogPage } from './session-log/session-log';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  public version: string;
  public commitHash: string;
  public title: string;
  private tapped = 0;
  public mode: string;

  constructor(
    private navCtrl: NavController,
    private appProvider: AppProvider,
    private logger: Logger,
    private externalLinkProvider: ExternalLinkProvider,
    private replaceParametersProvider: ReplaceParametersProvider,
    private translate: TranslateService,
    private bitpayProvider: BitPayProvider,
    private persistenceProvider: PersistenceProvider,
    private apiProvider: ApiProvider
  ) {}

  ionViewDidLoad() {
    this.logger.info('Loaded: AboutPage');
    this.commitHash = this.appProvider.info.commitHash;
    this.version = this.appProvider.info.version;
    this.mode = env && env.name;
    this.title = this.replaceParametersProvider.replace(
      this.translate.instant('About {{appName}}'),
      { appName: this.appProvider.info.nameCase }
    );
  }

  public openExternalLink(): void {
    const url = 'https://github.com/bitpay/'
      + this.appProvider.info.gitHubRepoName 
      + '/tree/' 
      + this.appProvider.info.commitHash 
      + '';
    const optIn = true;
    const title = this.translate.instant('Open GitHub Project');
    const message = this.translate.instant(
      'You can see the latest developments and contribute to this open source app by visiting our project on GitHub.'
    );
    const okText = this.translate.instant('Open GitHub');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public openTermsOfUse() {
    const url = this.apiProvider.getAddresses().ducatuscoins + '/legal';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('View Wallet Terms of Use');
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');

    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public openPrivacyPolicy() {
    const url = this.apiProvider.getAddresses().ducatuscoins + '/legal';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('View Privacy Policy');
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');

    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  public openSessionLog(): void {
    this.navCtrl.push(SessionLogPage);
  }

  public openSendFeedbackPage(): void {
    this.navCtrl.push(SendFeedbackPage);
  }
  // adding this for testing purposes
  public async wipeBitPayAccounts() {
    this.tapped++;

    if (this.tapped >= 10) {
      await this.persistenceProvider.removeAllBitPayAccounts(
        this.bitpayProvider.getEnvironment().network
      );

      alert('removed accounts');
      
      this.tapped = 0;
    }
  }
}
