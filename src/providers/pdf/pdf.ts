import { Injectable } from '@angular/core';

import jsPDF from 'jspdf';

import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';

declare const cordova;

@Injectable()
export class PdfProvider {
  public isCordova: boolean;
  public filename = 'ducatusWallet';
  private optionsMobile = {
    documentSize: 'A4',
    landscape: 'portrait',
    type: 'share',
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

  private createCordovaPDF(template, imgData?, filename?, optMobile?) {
    imgData ? null : null;
    if (filename) this.filename = filename + '.pdf';
    this.logger.warn('making pdf for mobile platforms');
    cordova.plugins.pdf
      .fromData(template, optMobile || this.optionsMobile)
      .then(sucess => this.logger.warn('sucess: ', sucess))
      .catch(error => this.logger.warn('error:', error));
  }

  private createWebPDF(template?, imgData?, filename?) {
    template ? null : null;
    if (filename) this.filename = filename + '.pdf';

    var img = new Image();
    img.src = imgData;

    img.onload = () => {
      var doc =
        img.width > img.height
          ? new jsPDF('l', 'px', [img.width, img.height])
          : new jsPDF('p', 'px', [img.width, img.height]);

      var width = doc.internal.pageSize.getWidth();
      var height = doc.internal.pageSize.getHeight();

      doc.addImage(img, 'PNG', 10, 10, width, height);
      doc.save(this.filename + '.pdf');
    };
  }
}
