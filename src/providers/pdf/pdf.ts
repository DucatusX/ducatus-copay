import { Injectable } from '@angular/core';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';

declare const cordova;

@Injectable()
export class PdfProvider {
  public isCordova: boolean;
  public filename = "ducatusWallet";
  private optionsMobile = {
    documentSize: 'A4',
    landscape: "portrait",
    type: "share",
    fileName: this.filename + '.pdf'
  };

  public makePdf: any;

  constructor(
    private logger: Logger,
    private platformProvider: PlatformProvider
  ) {
    this.isCordova = this.platformProvider.isCordova;
    this.makePdf = this.isCordova ? this.createCordovaPDF : this.createWebPDF;
  }

  private createCordovaPDF(template, filename?, optMobile?) {
    if (filename) this.filename = filename + '.pdf';
    this.logger.warn('making pdf for mobile platforms');
    cordova.plugins.pdf.fromData(template, optMobile || this.optionsMobile)
      .then((sucess) => this.logger.warn('sucess: ', sucess))
      .catch((error) => this.logger.warn('error:', error));
  }

  private createWebPDF(template, filename?, optMobile?) {

    const iframe = document.createElement('iframe');
    iframe.style.width = '796px';
    iframe.style.height = '0';
    document.getElementsByTagName('body')[0].appendChild(iframe);

    iframe.contentWindow.document.write(template);

    if (filename) this.filename = filename + '.pdf';
    html2canvas(iframe.contentDocument.getElementsByTagName('html')[0], optMobile || this.optionsMobile).then((canvas) => {
      let img = canvas.toDataURL("image/png");
      let pdf = new jsPDF();
      pdf.addImage(img, 'PNG', 0, 0);
      pdf.save((this.filename || 'ducatus') + '.pdf');
    });
  }

}
