import {Component, Inject, Input, NgZone, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef} from "@angular/material/dialog";
import {
  debounceTime,
  fromEvent,
  merge,
  Observable,
  timeout,
  map,
  tap,
  interval,
  take,
  scan,
  takeWhile,
  takeUntil, switchMap, empty, startWith, of, Subscription
} from "rxjs";

@Component({
  selector: 'app-idle-timer',
  template: `
    <p>idle-timer works! {{ count }}</p>
    <button mat-button (click)="startTimer()">Start Timer</button>
    <button mat-button (click)="stopTimer()">Stop Timer</button>
    <button mat-button (click)="showDialog()">Open dialog</button>
  `
})
export class IdleTimerComponent implements OnInit {

  @Input()
  minutes: number = 10;

  count: number = 0;
  counter$ = interval(1000);
  activityDetected$!: Observable<boolean>;

  sub!: Subscription;

  constructor(private dialog: MatDialog, private _ngZone: NgZone) {
  }

  ngOnInit(): void {
    console.log('Initializing timeout component for ', this.minutes, 'seconds');
    this.startTimer();
  }

  startTimer() {
    //console.log('startTimer()');

    this._ngZone.runOutsideAngular(() => {
      //console.log('setting up subscription');

      this.activityDetected$ = merge(
        fromEvent(document, 'wheel').pipe(map(() => true)),
        fromEvent(document, 'click').pipe(map(() => true)),
        fromEvent(document, 'mousemove').pipe(map(() => true)),
      ).pipe(
        tap((t) => console.log('.')),
        debounceTime(2000),
        tap((t) => console.log('activity detected in the last 2 seconds'))
      );

      if (this.sub) {
        this.sub.unsubscribe();
      }

      this.sub = this.counter$.pipe(
        map(() => -1),
        scan((acc, cur) => {
          return acc + cur;
        }, 15),
        takeWhile(val => val >= 0),
        tap((v) => console.log('count', v)),
        takeUntil(this.activityDetected$),

      ).subscribe({
        next: (value) => {
            //console.log('next', value);
            if (!value) {
              console.log('Lift off');
              this._ngZone.run(() => {
                this.showDialog();
              });

            }
          },
        error: (error: any) => {
          console.log('error', error)
        },
        complete: () => {
          console.log('complete');
          this.startTimer();
        }
      });
    });
  }

  stopTimer() {
    this.sub.unsubscribe();
  }

  showDialog() {
    this.stopTimer();

    const dialogRef = this.dialog.open(IdleTimeoutDialogComponent, {
      disableClose: true,
      autoFocus: true,
      height: '200px',
      width: '600px',
      position: {top: '100px'},
      data: {
        minutes: this.minutes
      }
    });

    dialogRef.afterClosed().subscribe(keepSignedIn => {
      console.log('The dialog was closed', keepSignedIn);
      //if (keepSignedIn) {
        this.startTimer();
      //}
    });
  }
}

export interface DialogData {
  minutes: number;
}

@Component({
  selector: 'dialog-overview-example-dialog',
  template: `
    <h2 mat-dialog-title>Idle Session</h2>
    <mat-dialog-content>
      <span class="content-span full-width">
        Your session has been idle for {{ minutes }} minutes.
        Do you want to keep signed in?
      </span>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button [mat-dialog-close]="false">Sign me out</button>
      <button mat-button [mat-dialog-close]="true">Keep me signed in</button>
    </mat-dialog-actions>
  `
})
export class IdleTimeoutDialogComponent {

  minutes: number;

  constructor(
    public dialogRef: MatDialogRef<IdleTimeoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.minutes = data.minutes;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
