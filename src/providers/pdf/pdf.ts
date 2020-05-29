import { Injectable } from '@angular/core';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
import * as QRCode from 'qrcode-svg';
import { Logger } from '../../providers/logger/logger';
import { PlatformProvider } from '../../providers/platform/platform';

declare const cordova;

@Injectable()
export class PdfProvider {
  public isCordova: boolean;
  private optionsDesktop = {
    allowTaint: true,
    useCORS: false,
    scale: 1
  };
  private optionsMobile = {
    documentSize: 'A4',
    landscape: "portrait",
    type: "share",
    fileName: "ducatusWallet.pdf"
  };

  constructor(
    private logger: Logger,
    private platformProvider: PlatformProvider
  ) { this.isCordova = this.platformProvider.isCordova; }

  public makeQrCodeSvg(value, level?, paddingValue?) {
    return new QRCode({
      content: value,
      join: true,
      container: 'svg-viewbox',
      padding: paddingValue || 3,
      ecl: level || "L",
    }).svg();
  }

  public makePdf(template, filename?, optMobile?, optDesktop?) {
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
      //   pdf.save((filename || 'ducatus') + '.pdf');
      // });
    }

  }

  // public printPaperWallet(htmlTemplate?, params?, options?) {

  //   if (options) { this.pdfOptions = options }
  //   if (params) {
  //     this.params = params;
  //     this.svgAddress = new QRCode({
  //       content: this.params.wallet_address,
  //       join: true,
  //       container: 'svg-viewbox',
  //       padding: 3,
  //       ecl: "L",
  //     }).svg();

  //     this.svgKey = new QRCode({
  //       content: this.params.key_qr,
  //       join: true,
  //       container: 'svg-viewbox',
  //       padding: 3,
  //       ecl: "L",
  //     }).svg();
  //   }

  //   // let pdfTemplates = {
  //   //   'default': '<html><body><h1>Base template</h1><br><p>to choose new template add it in pdf.ts in htmlTemplate</p></body></html>',
  //   //   'paperWallet':
  //   //     '<html>' +
  //   //     '<head>' +
  //   //     '<style>.content-top img{height:300px}.content-bottom{background-color:#fff;max-height:250px;min-height:250px;height:250px;width:100%;display:flex;align-items:center;padding:0;margin:0;justify-content:center;border:10px solid #c3b59b}.content-bottom svg{width:120px;height:120px}.content-bottom-left{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;min-width:50%;width:50%;border-right:5px solid #c3b59b;min-height:250px}.content-bottom-right{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;min-width:50%;width:50%;border-left:5px solid #c3b59b;min-height:250px}.content-bottom-text{color:#8f3534;margin:10px 0;padding:0;font-size:12px;text-align:center}.content-bottom-right .content-bottom-text{width:300px}.content-bottom-address{background-color:#e6e7e8;border-radius:10px;color:#000;font-size:12px;padding:10px 5px;display:flex;justify-content:center;align-items:center;margin-top:10px;margin-bottom:0;width:320px}.content-bottom-qrcode{border:10px solid #f5eddd;border-radius:5px}svg{min-width:100%;min-height:100%}</style>' +
  //   //     '</head>' +
  //   //     '<body>' +
  //   //     '<div class="content-top">' +
  //   //     '<img src="https://www.ducatuscoins.com/assets/img/printpaperwallet.png"/>' +
  //   //     '</div>' +
  //   //     '<div class="content-bottom">' +
  //   //     '<div class="content-bottom-left">' +
  //   //     '<p class="content-bottom-text"><b>Your public address</b></p>' +
  //   //     '<div class="content-bottom-qrcode">' + this.svgAddress + '</div>' +
  //   //     '<p class="content-bottom-address">' + this.params.wallet_address + '</p>' +
  //   //     '<p class="content-bottom-text">to be used for receiving ' + this.params.wallet_coin + '</p>' +
  //   //     '</div>' +
  //   //     '<div class="content-bottom-right">' +
  //   //     '<p class="content-bottom-text"><b>Your private wallet recovery key</b></p>' +
  //   //     '<div class="content-bottom-qrcode"> ' + this.svgKey + '</div>' +
  //   //     '<p class="content-bottom-text"> This key is all you needed to access your founds.</p>' +
  //   //     '</div>' +
  //   //     '</div>' +
  //   //     '</body>' +
  //   //     '</html>',
  //   //   'paperWallet_desktop':
  //   //     '<body>' +
  //   //     '<style>.content-top img{height:300px}.content-bottom{background-color:#fff;max-height:250px;min-height:250px;height:250px;width:100%;display:flex;align-items:center;padding:0;margin:0;justify-content:center;border:10px solid #c3b59b}.content-bottom svg{width:120px;height:120px}.content-bottom-left{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;min-width:50%;width:50%;border-right:5px solid #c3b59b;min-height:250px}.content-bottom-right{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;min-width:50%;width:50%;border-left:5px solid #c3b59b;min-height:250px}.content-bottom-text{color:#8f3534;margin:10px 0;padding:0;font-size:12px;text-align:center}.content-bottom-right .content-bottom-text{width:300px}.content-bottom-address{background-color:#e6e7e8;border-radius:10px;color:#000;font-size:12px;padding:10px 5px;display:flex;justify-content:center;align-items:center;margin-top:10px;margin-bottom:0;width:320px}.content-bottom-qrcode{border:10px solid #f5eddd;border-radius:5px}svg{min-width:100%;min-height:100%}</style>' +
  //   //     '<div class="content-top">' +
  //   //     '<img src="./assets/img/printpaperwallet.png"/>' +
  //   //     '</div>' +
  //   //     '<div class="content-bottom">' +
  //   //     '<div class="content-bottom-left">' +
  //   //     '<p class="content-bottom-text"><b>Your public address</b></p>' +
  //   //     '<div class="content-bottom-qrcode">' + this.svgAddress + '</div>' +
  //   //     '<p class="content-bottom-address">' + this.params.wallet_address + '</p>' +
  //   //     '<p class="content-bottom-text">to be used for receiving ' + this.params.wallet_coin + '</p>' +
  //   //     '</div>' +
  //   //     '<div class="content-bottom-right">' +
  //   //     '<p class="content-bottom-text"><b>Your private wallet recovery key</b></p>' +
  //   //     '<div class="content-bottom-qrcode"> ' + this.svgKey + '</div>' +
  //   //     '<p class="content-bottom-text"> This key is all you needed to access your founds.</p>' +
  //   //     '</div>' +
  //   //     '</div>' +
  //   //     '</body>'
  //   // }

  //   if (!this.isCordova) {
  //     // let pdfTemplate = htmlTemplate ? pdfTemplates[htmlTemplate + '_desktop'] : pdfTemplates['default'];
  //     // let pdfTemplate = htmlTemplate ? pdfTemplates[htmlTemplate] : pdfTemplates['default'];

  //     // html2canvas(pdfTemplate,
  //     //   { scale: 1 }
  //     // ).then(canvas => {
  //     //   let pdf = new jsPDF('p', 'mm', 'a4');
  //     //   pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 211, 298);
  //     //   pdf.save(this.params.fileName);
  //     // });

  //     html2canvas(pdfTemplate, {
  //       // Opciones
  //       allowTaint: true,
  //       useCORS: false,
  //       // Calidad del PDF
  //       scale: 1
  //     }).then(function (canvas) {
  //       var img = canvas.toDataURL("image/png");
  //       var doc = new jsPDF();
  //       doc.addImage(img, 'PNG', 7, 20, 195, 105);
  //       doc.save('postres.pdf');
  //     });

  //     // var doc = new jsPDF();
  //     // var elementHTML = pdfTemplate;
  //     // var specialElementHandlers = {
  //     //   '#elementH': function (element, renderer) {
  //     //     return true;
  //     //   }
  //     // };
  //     // doc.fromHTML(elementHTML, 15, 15, {
  //     //   'width': 170,
  //     //   'elementHandlers': specialElementHandlers
  //     // });

  //     // Save the PDF
  //     // doc.save('sample-document.pdf');

  //     // var doc = new jsPDF({
  //     //   orientation: 'portrait',
  //     //   unit: 'in',
  //     //   format: [4, 2]
  //     // })

  //     // doc.fromHTML(pdfTemplate, 15, 15);

  //     // doc.text(pdfTemplate, 1, 1);
  //     // doc.save(this.params.fileName);
  //     // doc.output("dataurlnewwindow");
  //   } else {
  //     // let pdfTemplate = htmlTemplate ? pdfTemplates[htmlTemplate] : pdfTemplates['default'];

  //     document.addEventListener('deviceready', () => {
  //       this.logger.warn('DEVICE READY FIRED AFTER');
  //       cordova.plugins.pdf.fromData(pdfTemplate, this.pdfOptions)
  //         .then((sucess) => this.logger.warn('sucess: ', sucess))
  //         .catch((error) => this.logger.warn('error:', error));
  //     });
  //   }
  // }

}
