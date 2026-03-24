import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordingPage } from './recording.page';

describe('RecordingPage', () => {
  let component: RecordingPage;
  let fixture: ComponentFixture<RecordingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
