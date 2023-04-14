import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ActionSheetController } from 'ionic-angular';

// providers
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { AppProvider } from '../../../../providers/app/app';
import { ConfigProvider } from '../../../../providers/config/config';
import { DownloadProvider } from '../../../../providers/download/download';
import { Logger } from '../../../../providers/logger/logger';
import { PlatformProvider } from '../../../../providers/platform/platform';

import * as _ from 'lodash';

@Component({
  selector: 'page-session-log',
  templateUrl: 'session-log.html'
})
export class SessionLogPage {
  private config;

  public logOptions;
  public filteredLogs;
  public filterValue: number;
  public isCordova: boolean;

  constructor(
    private configProvider: ConfigProvider,
    private logger: Logger,
    private actionSheetCtrl: ActionSheetController,
    private platformProvider: PlatformProvider,
    private translate: TranslateService,
    private actionSheetProvider: ActionSheetProvider,
    private downloadProvider: DownloadProvider,
    private appProvider: AppProvider
  ) {
    this.config = this.configProvider.get();
    this.isCordova = this.platformProvider.isCordova;
    const logLevels = this.logger.getLevels();
    this.logOptions = _.keyBy(logLevels, 'weight');
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SessionLogPage');
  }

  ionViewWillEnter() {
    const selectedLevel = _.has(this.config, 'log.weight')
      ? this.logger.getWeight(this.config.log.weight)
      : this.logger.getDefaultWeight();
    this.filterValue = selectedLevel.weight;
    this.setOptionSelected(selectedLevel.weight);
    this.filterLogs(selectedLevel.weight);
  }

  private filterLogs(weight: number): void {
    this.filteredLogs = _.sortBy(this.logger.get(weight), 'timestamp');
  }

  public setOptionSelected(weight: number): void {
    this.filterLogs(weight);
    const opts = {
      log: {
        weight
      }
    };
    this.configProvider.set(opts);
  }

  private prepareSessionLogs() {
    let log: string =
      'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
    log += '\n\n';

    const weight = 4; // share complete logs
    const logs = _.sortBy(this.logger.get(weight), 'timestamp');

    Object.keys(logs).forEach(key => {
      log +=
        '[' +
        logs[key].timestamp +
        '][' +
        logs[key].level +
        ']' +
        logs[key].msg +
        '\n';
    });
    return log;
  }

  public showOptionsMenu(): void {
    const downloadText = this.translate.instant('Download logs');
    const shareText = this.translate.instant('Share logs');
    const button = [];

    button.push({
      text: this.isCordova ? shareText : downloadText,
      handler: () => {
        this.showWarningModal();
      }
    });

    const actionSheet = this.actionSheetCtrl.create({
      title: '',
      buttons: button
    });
    actionSheet.present();
  }

  private showWarningModal(): void {
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'sensitive-info'
    );
    infoSheet.present();
  }

  public download(): void {
    const logs = this.prepareSessionLogs();
    const now = new Date().toISOString();
    const filename = this.appProvider.info.nameCase + '-logs ' + now + '.txt';
    this.downloadProvider.download(logs, filename);
  }
}
