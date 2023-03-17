import {Component, EventEmitter, Inject, Input, NgZone, OnInit, Output} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {
  debounceTime,
  fromEvent,
  merge,
  Observable,
  map,
  tap,
  interval,
  scan,
  takeWhile,
  takeUntil, Subscription
} from "rxjs";

@Component({
  selector: 'app-idle-timer',
  template: ``
})
export class IdleTimerComponent implements OnInit {

  /** the number of seconds the user is allowed to remain inactive, before being asked */
  @Input()
  timeoutSeconds: number = 60;
  /** the number of seconds the user is given to choose if he wishes to stay logged in */
  @Input()
  graceSeconds: number = 15;
  /** number of seconds to batch activity events for debouncing */
  @Input()
  debounceSeconds: number = 10;
  @Output() onTimeout = new EventEmitter<number>();

  private sub!: Subscription;

  constructor(private dialog: MatDialog, private _ngZone: NgZone) {
  }

  ngOnInit(): void {
    console.log('Timeout in', this.timeoutSeconds, 'seconds. Grace period', this.graceSeconds, 'seconds');
    this.startTimer();
  }

  startTimer() {
    this._ngZone.runOutsideAngular(() => {

      if (this.sub) {
        this.sub.unsubscribe();
      }

      const activityDetected$ = merge(
        fromEvent(window, 'keypress').pipe(map(() => true)),
        fromEvent(window, 'mousemove').pipe(map(() => true)),
        fromEvent(window, 'scroll').pipe(map(() => true)),
        fromEvent(window, 'wheel').pipe(map(() => true)),
        fromEvent(window, 'click').pipe(map(() => true)),
      ).pipe(
        debounceTime(this.debounceSeconds),
      );

      this.sub = interval(1000).pipe(
        map(() => -1),
        scan((acc, cur) => {
          return acc + cur;
        }, this.timeoutSeconds),
        takeWhile(val => val >= 0),
        takeUntil(activityDetected$),
      ).subscribe({
        next: (value) => {
          if (!value) {
            this._ngZone.run(() => {
              this.showDialog();
            });
          }
        },
        error: (error: any) => {
          console.log('error', error)
        },
        complete: () => {
          this.startTimer();
        }
      });
    });
  }

  showDialog() {
    this.sub.unsubscribe();

    const dialogRef = this.dialog.open(IdleTimeoutDialogComponent, {
      disableClose: true,
      autoFocus: true,
      height: '200px',
      width: '600px',
      position: {top: '100px'},
      data: {
        seconds: this.timeoutSeconds,
        grace: this.graceSeconds,
      }
    });

    dialogRef.afterClosed().subscribe(keepSignedIn => {
      if (keepSignedIn) {
        // if user wants to stay signed in, then restart timer for a brand-new iteration
        this.startTimer();
      } else {
        // if user chose to sign out, or if the grace period ran out, emit onTimeout() to let parent know
        this.onTimeout.emit();
      }
    });
  }
}

export interface DialogData {
  seconds: number;
  grace: number;
}

@Component({
  selector: 'dialog-overview-example-dialog',
  template: `
    <h2 mat-dialog-title>Your session has been idle for {{ seconds }} seconds</h2>
    <mat-dialog-content>
      <span class="content-span full-width">
        You will be automatically logged off in {{ grace }} seconds.
      </span>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button [mat-dialog-close]="false">Sign me out</button>
      <button mat-button [mat-dialog-close]="true" (click)="onClose()">Keep me signed in</button>
    </mat-dialog-actions>
  `
})
export class IdleTimeoutDialogComponent {

  /** the number of seconds the user remained inactive - will be shown on the popup dialog */
  seconds: number;
  /** the number of seconds the user has left to decide if he chooses to stay logged in */
  grace: number;
  private sub: Subscription;

  constructor(
    private dialogRef: MatDialogRef<IdleTimeoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: DialogData) {

    this.seconds = data.seconds;
    this.grace = data.grace;

    this.sub = interval(1000).pipe(
      map(() => -1),
      scan((acc, cur) => {
        return acc + cur;
      }, this.grace),
      takeWhile(val => val >= 0),

    ).subscribe(
      (value) => {
        if (!value) {
          this.dialogRef.close();
        } else {
          this.grace = value;
        }
      }
    );
  }

  onClose() {
    this.sub.unsubscribe();
  }
}
