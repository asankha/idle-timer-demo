import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'idle-timer-demo';

  onTimeout() {
    console.log('Logoff user!')
  }
}
