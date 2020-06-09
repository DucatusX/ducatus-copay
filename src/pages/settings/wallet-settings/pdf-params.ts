export const pdfParams = {
  mobileStyle:
    `<style>
        body {
          margin: 0;
        }
        .paper-pdf-desktop {
          width: 1000px
        }
        .content-top img {
          height:352px
        }
        .content-bottom {
          background-color: #fff;
          max-height: 270px;
          min-height: 270px;
          height: 270px;
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0;
          margin: 0;
          justify-content: center;
          border:10px solid #c3b59b
        }
        .content-bottom-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-width: 50%;
          width: 50%;
          border-right: 5px solid #c3b59b;
          min-height: 270px;
        }
        .content-bottom-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-width: 50%;
          width: 50%;
          border-left: 5px solid #c3b59b;
          min-height: 270px
        }
        .content-bottom-text {
          color: #8f3534;
          margin: 10px 0;
          padding: 0;
          font-size: 12px;
          text-align: center
        }
        .content-bottom-right .content-bottom-text {
          width:300px
        }
        .content-bottom-address {
          background-color: #e6e7e8;
          border-radius: 10px;
          color: #000;
          font-size: 12px;
          padding: 10px 5px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
          margin-bottom: 0;
          width: 320px
        }

        .content-bottom-qrcode {
          width: 130px;
          height: 130px;
        }

        .content-bottom-qrcode svg,
        .content-bottom-qrcode img {
          width:100%;
          height:100%;
          border: 10px solid #f5eddd;
          border-radius: 5px;
        }
      </style>`
};