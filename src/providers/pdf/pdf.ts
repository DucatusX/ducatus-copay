import { Injectable } from '@angular/core';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';

declare const cordova;

@Injectable()
export class PdfProvider {
  public isCordova: boolean;
  public filename = "ducatusWallet";
  // private optionsDesktop = {
  //   allowTaint: true,
  //   useCORS: false,
  //   scale: 1
  // };
  private optionsMobile = {
    documentSize: 'A4',
    landscape: "portrait",
    type: "share",
    fileName: this.filename + '.pdf'
  };

  constructor(
    private logger: Logger,
    private platformProvider: PlatformProvider
  ) { this.isCordova = this.platformProvider.isCordova; }

  public makePdf(template, filename?, optMobile?) {

    if (filename) this.filename = filename + '.pdf';

    if (this.isCordova) {
      document.addEventListener('deviceready', () => {
        this.logger.warn('making pdf for mobile platforms');
        cordova.plugins.pdf.fromData(template, optMobile || this.optionsMobile)
          .then((sucess) => this.logger.warn('sucess: ', sucess))
          .catch((error) => this.logger.warn('error:', error));
      });
    } else {
      this.logger.warn('making pdf for web or other platforms');
      // html2canvas(template, optDesktop || this.optionsDesktop).then((canvas) => {
      //   let img = canvas.toDataURL("image/png");
      //   let pdf = new jsPDF();
      //   pdf.addImage(img, 'PNG', 7, 20, 195, 105);
      //   pdf.save((this.filename || 'ducatus') + '.pdf');
      // });
    }

  }
}
