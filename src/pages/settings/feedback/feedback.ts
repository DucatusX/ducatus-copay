import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiProvider } from '../../../providers/api/api';
import { AlertController } from 'ionic-angular';

@Component({
  selector: 'page-feedback',
  templateUrl: 'feedback.html'
})
export class FeedbackPage {
  public feedbackForm: FormGroup;
  public regexEmailValidate = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  public disabledForm = false;

  constructor(
    private formBuilder: FormBuilder,
    private apiProvider: ApiProvider,
    private httpClient: HttpClient,
    private alertCtrl: AlertController
  ) {
    this.createForm();
  }

  private createForm() {
    this.feedbackForm = this.formBuilder.group({
      subject: ['', Validators.required],
      email: ['', [Validators.pattern(this.regexEmailValidate), Validators.required]],
      message: ['', [Validators.minLength(20), Validators.required]],
    });
  }

  get subject() {
    return this.feedbackForm.get('subject');
  }

  get email() {
    return this.feedbackForm.get('email');
  }

  get message() {
    return this.feedbackForm.get('message');
  }

  private viewSendResult(message: string, err: boolean): void {
    let viewWindow = {
      cssClass: 'voucher-alert',
      title:
        '<img src ="./assets/img/icon-check-selected.svg" width="42px" height="42px">',
      message,
      buttons: [
        {
          text: 'ok'
        }
      ]
    };

    if (err) {
      viewWindow.title =
        '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">';
    }
    
    let alert = this.alertCtrl.create(viewWindow);
    alert.present();
  }

  public onSubmit() {

    this.disabledForm = true

    this.httpClient
      .post(
        `${this.apiProvider.getAddresses().ducatuscoins}/api/v1/send_ducatus_feedback/`,
        {
          isWallet: true,
          email: this.feedbackForm.get('email').value,
          message: this.feedbackForm.get('message').value,
          subject: this.feedbackForm.get('subject').value,
        }
      )
      .toPromise()
      .then(() => {
        this.viewSendResult('We will reply soon', false);
        this.feedbackForm.reset();
        this.disabledForm = false
      })
      .catch(()=>{
        this.viewSendResult('something went wrong please try again later',
        true)
        this.disabledForm = false
     })
     
  }
  
}
