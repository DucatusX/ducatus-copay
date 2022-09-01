import { Component, ComponentRef } from '@angular/core';
import { InfoSheetComponent } from '../../components/info-sheet/info-sheet';
import { ApiProvider } from '../../providers/api/api';
import { ActionSheetParent } from '../action-sheet/action-sheet-parent';

// Providers
import { InfoSheetType } from '../../providers/action-sheet/action-sheet';
import { DomProvider } from '../../providers/dom/dom';

@Component({
  selector: 'tx-confirm',
  templateUrl: 'tx-confirm.html'
})
export class TxConfirmComponent extends ActionSheetParent {
  public jwanStakeAddress: string;
  public feePrewiew;
  public amount;
  public title: string;

  constructor(private domProvider: DomProvider, private apiProvider: ApiProvider) {
    super();
  }

  ngOnInit() {
    this.jwanStakeAddress = this.apiProvider.getAddresses().jwanStakeAddress;
    this.feePrewiew = this.params.feePrewiew;
    this.amount = this.params.amount;
    this.title = this.params.title;
  }

  public createInfoSheet(type: InfoSheetType, params?): InfoSheetComponent {
    return this.setupSheet<InfoSheetComponent>(InfoSheetComponent, type, params)
      .instance;
  }

  private setupSheet<T extends ActionSheetParent>(
    componentType: { new (...args): T },
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