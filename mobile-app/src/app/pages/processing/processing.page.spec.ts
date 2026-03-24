import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessingPage } from './processing.page';

describe('ProcessingPage', () => {
  let component: ProcessingPage;
  let fixture: ComponentFixture<ProcessingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcessingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
