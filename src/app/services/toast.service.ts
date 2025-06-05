import { Injectable } from '@angular/core';
import { AppComponent } from '../app.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private appComponent!: AppComponent;

  public registerApp(appComponent: AppComponent) {
    this.appComponent = appComponent;
  }

  public showError(message: string) {
    this.appComponent?.triggerToast(message,'#F44336');
  }

  public showSuccess(message: string) {
    this.appComponent?.triggerToast(message,'#4CAF50');
  }

  public showWarning(message: string) {
    this.appComponent?.triggerToast(message,'#FF9800');
  }

  public showInfo(message: string) {
    this.appComponent?.triggerToast(message,'#2196F3');
  }

  public showPrimary(message: string) {
    this.appComponent?.triggerToast(message,'#3F51B5');
  }

  public showSecondary(message: string) {
    this.appComponent?.triggerToast(message,'#9E9E9E');
  }
}
