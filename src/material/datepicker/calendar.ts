/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentPortal, ComponentType, Portal} from '@angular/cdk/portal';
import {
  AfterContentInit,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import {Subject, Subscription} from 'rxjs';
import {MatCalendarUserEvent, MatCalendarCellClassFunction} from './calendar-body';
import {createMissingDateImplError} from './datepicker-errors';
import {MatDatepickerIntl} from './datepicker-intl';
import {MatMonthView} from './month-view';
import {
  getActiveOffset,
  isSameMultiYearView,
  MatMultiYearView,
  yearsPerPage
} from './multi-year-view';
import {MatYearView} from './year-view';
import {MAT_SINGLE_DATE_SELECTION_MODEL_PROVIDER, DateRange} from './date-selection-model';

/**
 * Possible views for the calendar.
 *
 * 日历的可选视图。
 *
 * @docs-private
 */
export type MatCalendarView = 'month' | 'year' | 'multi-year';

/**
 * Counter used to generate unique IDs.
 *
 * 用于生成唯一 ID 的计数器。
 *
 */
let uniqueId = 0;

/**
 * Default header for MatCalendar
 *
 * MatCalendar 的默认标头
 *
 */
@Component({
  selector: 'mat-calendar-header',
  templateUrl: 'calendar-header.html',
  exportAs: 'matCalendarHeader',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatCalendarHeader<D> {
  _buttonDescriptionId = `mat-calendar-button-${uniqueId++}`;

  constructor(private _intl: MatDatepickerIntl,
              @Inject(forwardRef(() => MatCalendar)) public calendar: MatCalendar<D>,
              @Optional() private _dateAdapter: DateAdapter<D>,
              @Optional() @Inject(MAT_DATE_FORMATS) private _dateFormats: MatDateFormats,
              changeDetectorRef: ChangeDetectorRef) {

    this.calendar.stateChanges.subscribe(() => changeDetectorRef.markForCheck());
  }

  /**
   * The label for the current calendar view.
   *
   * 当前日历视图的标签。
   *
   */
  get periodButtonText(): string {
    if (this.calendar.currentView == 'month') {
      return this._dateAdapter
          .format(this.calendar.activeDate, this._dateFormats.display.monthYearLabel)
              .toLocaleUpperCase();
    }
    if (this.calendar.currentView == 'year') {
      return this._dateAdapter.getYearName(this.calendar.activeDate);
    }

    // The offset from the active year to the "slot" for the starting year is the
    // *actual* first rendered year in the multi-year view, and the last year is
    // just yearsPerPage - 1 away.
    const activeYear = this._dateAdapter.getYear(this.calendar.activeDate);
    const minYearOfPage = activeYear - getActiveOffset(
      this._dateAdapter, this.calendar.activeDate, this.calendar.minDate, this.calendar.maxDate);
    const maxYearOfPage = minYearOfPage + yearsPerPage - 1;
    const minYearName =
      this._dateAdapter.getYearName(this._dateAdapter.createDate(minYearOfPage, 0, 1));
    const maxYearName =
      this._dateAdapter.getYearName(this._dateAdapter.createDate(maxYearOfPage, 0, 1));
    return this._intl.formatYearRange(minYearName, maxYearName);
  }

  get periodButtonLabel(): string {
    return this.calendar.currentView == 'month' ?
        this._intl.switchToMultiYearViewLabel : this._intl.switchToMonthViewLabel;
  }

  /**
   * The label for the previous button.
   *
   * 前一个按钮的标签。
   *
   */
  get prevButtonLabel(): string {
    return {
      'month': this._intl.prevMonthLabel,
      'year': this._intl.prevYearLabel,
      'multi-year': this._intl.prevMultiYearLabel
    }[this.calendar.currentView];
  }

  /**
   * The label for the next button.
   *
   * 下一个按钮的标签。
   *
   */
  get nextButtonLabel(): string {
    return {
      'month': this._intl.nextMonthLabel,
      'year': this._intl.nextYearLabel,
      'multi-year': this._intl.nextMultiYearLabel
    }[this.calendar.currentView];
  }

  /**
   * Handles user clicks on the period label.
   *
   * 处理用户点击“时间段标签”的操作。
   *
   */
  currentPeriodClicked(): void {
    this.calendar.currentView = this.calendar.currentView == 'month' ? 'multi-year' : 'month';
  }

  /**
   * Handles user clicks on the previous button.
   *
   * 处理用户点击“上月”按钮的操作。
   *
   */
  previousClicked(): void {
    this.calendar.activeDate = this.calendar.currentView == 'month' ?
        this._dateAdapter.addCalendarMonths(this.calendar.activeDate, -1) :
            this._dateAdapter.addCalendarYears(
                this.calendar.activeDate, this.calendar.currentView == 'year' ? -1 : -yearsPerPage
            );
  }

  /**
   * Handles user clicks on the next button.
   *
   * 处理用户点击“下月”按钮的操作。
   *
   */
  nextClicked(): void {
    this.calendar.activeDate = this.calendar.currentView == 'month' ?
        this._dateAdapter.addCalendarMonths(this.calendar.activeDate, 1) :
            this._dateAdapter.addCalendarYears(
                this.calendar.activeDate,
                    this.calendar.currentView == 'year' ? 1 : yearsPerPage
            );
  }

  /**
   * Whether the previous period button is enabled.
   *
   * 是否启用“上个时间段”按钮。
   *
   */
  previousEnabled(): boolean {
    if (!this.calendar.minDate) {
      return true;
    }
    return !this.calendar.minDate ||
        !this._isSameView(this.calendar.activeDate, this.calendar.minDate);
  }

  /**
   * Whether the next period button is enabled.
   *
   * 是否启用“下个时间段”按钮。
   *
   */
  nextEnabled(): boolean {
    return !this.calendar.maxDate ||
        !this._isSameView(this.calendar.activeDate, this.calendar.maxDate);
  }

  /**
   * Whether the two dates represent the same view in the current view mode (month or year).
   *
   * 这两个日期在当前视图模式（月或年）中是否代表相同的视图。
   *
   */
  private _isSameView(date1: D, date2: D): boolean {
    if (this.calendar.currentView == 'month') {
      return this._dateAdapter.getYear(date1) == this._dateAdapter.getYear(date2) &&
          this._dateAdapter.getMonth(date1) == this._dateAdapter.getMonth(date2);
    }
    if (this.calendar.currentView == 'year') {
      return this._dateAdapter.getYear(date1) == this._dateAdapter.getYear(date2);
    }
    // Otherwise we are in 'multi-year' view.
    return isSameMultiYearView(
      this._dateAdapter, date1, date2, this.calendar.minDate, this.calendar.maxDate);
  }
}

/**
 * A calendar that is used as part of the datepicker.
 *
 * 一个用作日期选择器一部分的日历。
 *
 * @docs-private
 */
@Component({
  selector: 'mat-calendar',
  templateUrl: 'calendar.html',
  styleUrls: ['calendar.css'],
  host: {
    'class': 'mat-calendar',
  },
  exportAs: 'matCalendar',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MAT_SINGLE_DATE_SELECTION_MODEL_PROVIDER]
})
export class MatCalendar<D> implements AfterContentInit, AfterViewChecked, OnDestroy, OnChanges {
  /**
   * An input indicating the type of the header component, if set.
   *
   * 一个指出标头组件类型的输入属性（如果已设置）。
   *
   */
  @Input() headerComponent: ComponentType<any>;

  /**
   * A portal containing the header component type for this calendar.
   *
   * 一个传送点，里面包含该日历的标头组件的类型。
   *
   */
  _calendarHeaderPortal: Portal<any>;

  private _intlChanges: Subscription;

  /**
   * Used for scheduling that focus should be moved to the active cell on the next tick.
   * We need to schedule it, rather than do it immediately, because we have to wait
   * for Angular to re-evaluate the view children.
   *
   * 用来表示焦点是否应该在下一个周期中移动到活动单元格上。我们需要计划它，而不能立即执行，因为我们必须等待 Angular 重新评估视图子组件。
   *
   */
  private _moveFocusOnNextTick = false;

  /**
   * A date representing the period (month or year) to start the calendar in.
   *
   * 表示时间段（月或年）的起始日期。
   *
   */
  @Input()
  get startAt(): D | null { return this._startAt; }
  set startAt(value: D | null) {
    this._startAt = this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _startAt: D | null;

  /**
   * Whether the calendar should be started in month or year view.
   *
   * 日历应该开始于月份视图还是年份视图。
   *
   */
  @Input() startView: MatCalendarView = 'month';

  /**
   * The currently selected date.
   *
   * 当前选定日期。
   *
   */
  @Input()
  get selected(): DateRange<D> | D | null { return this._selected; }
  set selected(value: DateRange<D> | D | null) {
    if (value instanceof DateRange) {
      this._selected = value;
    } else {
      this._selected = this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(value));
    }
  }
  private _selected: DateRange<D> | D | null;

  /**
   * The minimum selectable date.
   *
   * 最小可选日期。
   *
   */
  @Input()
  get minDate(): D | null { return this._minDate; }
  set minDate(value: D | null) {
    this._minDate = this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _minDate: D | null;

  /**
   * The maximum selectable date.
   *
   * 最大可选日期。
   *
   */
  @Input()
  get maxDate(): D | null { return this._maxDate; }
  set maxDate(value: D | null) {
    this._maxDate = this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(value));
  }
  private _maxDate: D | null;

  /**
   * Function used to filter which dates are selectable.
   *
   * 用于过滤可选择哪些日期的函数。
   *
   */
  @Input() dateFilter: (date: D) => boolean;

  /**
   * Function that can be used to add custom CSS classes to dates.
   *
   * 可以用来为日期添加自定义 CSS 类的函数。
   *
   */
  @Input() dateClass: MatCalendarCellClassFunction<D>;

  /**
   * Start of the comparison range.
   *
   * 比较范围的起始日期。
   *
   */
  @Input() comparisonStart: D | null;

  /**
   * End of the comparison range.
   *
   * 比较范围的结束日期。
   *
   */
  @Input() comparisonEnd: D | null;

  /**
   * Emits when the currently selected date changes.
   *
   * 当前选定的日期发生变化时发出通知。
   *
   */
  @Output() readonly selectedChange: EventEmitter<D | null> = new EventEmitter<D | null>();

  /**
   * Emits the year chosen in multiyear view.
   * This doesn't imply a change on the selected date.
   *
   * 在多年份视图中选择年份。这不会更改选定日期。
   *
   */
  @Output() readonly yearSelected: EventEmitter<D> = new EventEmitter<D>();

  /**
   * Emits the month chosen in year view.
   * This doesn't imply a change on the selected date.
   *
   * 在年份视图中选择月份。这不会更改选定日期。
   *
   */
  @Output() readonly monthSelected: EventEmitter<D> = new EventEmitter<D>();

  /**
   * Emits when the current view changes.
   *
   * 当前视图发生变化时触发。
   *
   */
  @Output() readonly viewChanged: EventEmitter<MatCalendarView> =
    new EventEmitter<MatCalendarView>(true);

  /**
   * Emits when any date is selected.
   *
   * 选定任何日期时会发出通知。
   *
   */
  @Output() readonly _userSelection: EventEmitter<MatCalendarUserEvent<D | null>> =
      new EventEmitter<MatCalendarUserEvent<D | null>>();

  /**
   * Reference to the current month view component.
   *
   * 引用当前的月份视图组件。
   *
   */
  @ViewChild(MatMonthView) monthView: MatMonthView<D>;

  /**
   * Reference to the current year view component.
   *
   * 引用当前的年份视图组件。
   *
   */
  @ViewChild(MatYearView) yearView: MatYearView<D>;

  /**
   * Reference to the current multi-year view component.
   *
   * 引用当前的多年份视图组件。
   *
   */
  @ViewChild(MatMultiYearView) multiYearView: MatMultiYearView<D>;

  /**
   * The current active date. This determines which time period is shown and which date is
   * highlighted when using keyboard navigation.
   *
   * 目前的活跃日期。这决定了在使用键盘导航时会显示哪个时间段以及突出显示的是哪个日期。
   *
   */
  get activeDate(): D { return this._clampedActiveDate; }
  set activeDate(value: D) {
    this._clampedActiveDate = this._dateAdapter.clampDate(value, this.minDate, this.maxDate);
    this.stateChanges.next();
    this._changeDetectorRef.markForCheck();
  }
  private _clampedActiveDate: D;

  /**
   * Whether the calendar is in month view.
   *
   * 此日历是否位于月份视图中。
   *
   */
  get currentView(): MatCalendarView { return this._currentView; }
  set currentView(value: MatCalendarView) {
    const viewChangedResult = this._currentView !== value ? value : null;
    this._currentView = value;
    this._moveFocusOnNextTick = true;
    this._changeDetectorRef.markForCheck();
    if (viewChangedResult) {
      this.viewChanged.emit(viewChangedResult);
    }
  }
  private _currentView: MatCalendarView;

  /**
   * Emits whenever there is a state change that the header may need to respond to.
   *
   * 每当状态发生变化时，都会发出标头可能需要响应的信息。
   *
   */
  readonly stateChanges = new Subject<void>();

  constructor(_intl: MatDatepickerIntl,
              @Optional() private _dateAdapter: DateAdapter<D>,
              @Optional() @Inject(MAT_DATE_FORMATS) private _dateFormats: MatDateFormats,
              private _changeDetectorRef: ChangeDetectorRef) {

    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      if (!this._dateAdapter) {
        throw createMissingDateImplError('DateAdapter');
      }

      if (!this._dateFormats) {
        throw createMissingDateImplError('MAT_DATE_FORMATS');
      }
    }

    this._intlChanges = _intl.changes.subscribe(() => {
      _changeDetectorRef.markForCheck();
      this.stateChanges.next();
    });
  }

  ngAfterContentInit() {
    this._calendarHeaderPortal = new ComponentPortal(this.headerComponent || MatCalendarHeader);
    this.activeDate = this.startAt || this._dateAdapter.today();

    // Assign to the private property since we don't want to move focus on init.
    this._currentView = this.startView;
  }

  ngAfterViewChecked() {
    if (this._moveFocusOnNextTick) {
      this._moveFocusOnNextTick = false;
      this.focusActiveCell();
    }
  }

  ngOnDestroy() {
    this._intlChanges.unsubscribe();
    this.stateChanges.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    const change =
        changes['minDate'] || changes['maxDate'] || changes['dateFilter'];

    if (change && !change.firstChange) {
      const view = this._getCurrentViewComponent();

      if (view) {
        // We need to `detectChanges` manually here, because the `minDate`, `maxDate` etc. are
        // passed down to the view via data bindings which won't be up-to-date when we call `_init`.
        this._changeDetectorRef.detectChanges();
        view._init();
      }
    }

    this.stateChanges.next();
  }

  focusActiveCell() {
    this._getCurrentViewComponent()._focusActiveCell(false);
  }

  /**
   * Updates today's date after an update of the active date
   *
   * 在活动日期更新后更新今天的日期
   *
   */
  updateTodaysDate() {
    const currentView = this.currentView;
    let view: MatMonthView<D> | MatYearView<D> | MatMultiYearView<D>;

    if (currentView === 'month') {
      view = this.monthView;
    } else if (currentView === 'year') {
      view = this.yearView;
    } else {
      view = this.multiYearView;
    }

    view._init();
  }

  /**
   * Handles date selection in the month view.
   *
   * 在月份视图中处理日期选择。
   *
   */
  _dateSelected(event: MatCalendarUserEvent<D | null>): void {
    const date = event.value;

    if (this.selected instanceof DateRange ||
        (date && !this._dateAdapter.sameDate(date, this.selected))) {
      this.selectedChange.emit(date);
    }

    this._userSelection.emit(event);
  }

  /**
   * Handles year selection in the multiyear view.
   *
   * 在多年份视图中处理年份选择。
   *
   */
  _yearSelectedInMultiYearView(normalizedYear: D) {
    this.yearSelected.emit(normalizedYear);
  }

  /**
   * Handles month selection in the year view.
   *
   * 在年份视图中处理月份选择。
   *
   */
  _monthSelectedInYearView(normalizedMonth: D) {
    this.monthSelected.emit(normalizedMonth);
  }

  /**
   * Handles year/month selection in the multi-year/year views.
   *
   * 处理多年/年份视图中的年份/月份选择。
   *
   */
  _goToDateInView(date: D, view: 'month' | 'year' | 'multi-year'): void {
    this.activeDate = date;
    this.currentView = view;
  }

  /**
   * Returns the component instance that corresponds to the current calendar view.
   *
   * 返回与当前日历视图对应的组件实例。
   *
   */
  private _getCurrentViewComponent() {
    return this.monthView || this.yearView || this.multiYearView;
  }
}
