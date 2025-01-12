/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Output,
  Directive,
  EventEmitter,
  Input,
  OnDestroy,
  Optional,
  ChangeDetectorRef,
  SkipSelf,
  Inject,
} from '@angular/core';
import {UniqueSelectionDispatcher} from '@angular/cdk/collections';
import {CDK_ACCORDION, CdkAccordion} from './accordion';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {Subscription} from 'rxjs';

/**
 * Used to generate unique ID for each accordion item.
 *
 * 用来为每个手风琴条目生成唯一的 ID。
 *
 */
let nextId = 0;

/**
 * An basic directive expected to be extended and decorated as a component.  Sets up all
 * events and attributes needed to be managed by a CdkAccordion parent.
 *
 * 一个基本指令，供使用者扩展并改成组件装饰器。设置所有要由 CdkAccordion 的父指令管理的事件和属性。
 *
 */
@Directive({
  selector: 'cdk-accordion-item, [cdkAccordionItem]',
  exportAs: 'cdkAccordionItem',
  providers: [
    // Provide `CDK_ACCORDION` as undefined to prevent nested accordion items from
    // registering to the same accordion.
    {provide: CDK_ACCORDION, useValue: undefined},
  ],
})
export class CdkAccordionItem implements OnDestroy {
  /**
   * Subscription to openAll/closeAll events.
   *
   * 订阅 openAll / closeAll 事件。
   *
   */
  private _openCloseAllSubscription = Subscription.EMPTY;
  /**
   * Event emitted every time the AccordionItem is closed.
   *
   * 每次关闭此条目时都会发出本事件。
   *
   */
  @Output() readonly closed: EventEmitter<void> = new EventEmitter<void>();
  /**
   * Event emitted every time the AccordionItem is opened.
   *
   * 每次打开此条目时都会发出本事件。
   *
   */
  @Output() readonly opened: EventEmitter<void> = new EventEmitter<void>();
  /**
   * Event emitted when the AccordionItem is destroyed.
   *
   * 当此条目被销毁时会发出本事件。
   *
   */
  @Output() readonly destroyed: EventEmitter<void> = new EventEmitter<void>();

  /**
   * Emits whenever the expanded state of the accordion changes.
   * Primarily used to facilitate two-way binding.
   *
   * 每当手风琴展开状态发生变化时，就会触发。主要是为了方便进行双向绑定。
   *
   * @docs-private
   */
  @Output() readonly expandedChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  /**
   * The unique AccordionItem id.
   *
   * AccordionItem 的唯一 id。
   *
   */
  readonly id: string = `cdk-accordion-child-${nextId++}`;

  /**
   * Whether the AccordionItem is expanded.
   *
   * 此条目是否已经展开了。
   *
   */
  @Input()
  get expanded(): boolean { return this._expanded; }
  set expanded(expanded: boolean) {
    expanded = coerceBooleanProperty(expanded);

    // Only emit events and update the internal value if the value changes.
    if (this._expanded !== expanded) {
      this._expanded = expanded;
      this.expandedChange.emit(expanded);

      if (expanded) {
        this.opened.emit();
        /**
         * In the unique selection dispatcher, the id parameter is the id of the CdkAccordionItem,
         * the name value is the id of the accordion.
         *
         * 在唯一选项派发器中，其 id 参数是 CdkAccordionItem 的 id，其 name 的值是这个手风琴的 id。
         *
         */
        const accordionId = this.accordion ? this.accordion.id : this.id;
        this._expansionDispatcher.notify(this.id, accordionId);
      } else {
        this.closed.emit();
      }

      // Ensures that the animation will run when the value is set outside of an `@Input`.
      // This includes cases like the open, close and toggle methods.
      this._changeDetectorRef.markForCheck();
    }
  }
  private _expanded = false;

  /**
   * Whether the AccordionItem is disabled.
   *
   * 此条目是否已禁用了。
   *
   */
  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(disabled: boolean) { this._disabled = coerceBooleanProperty(disabled); }
  private _disabled = false;

  /**
   * Unregister function for \_expansionDispatcher.
   *
   * 取消注册 \_expansionDispatcher 的函数。
   *
   */
  private _removeUniqueSelectionListener: () => void = () => {};

  constructor(@Optional() @Inject(CDK_ACCORDION) @SkipSelf() public accordion: CdkAccordion,
              private _changeDetectorRef: ChangeDetectorRef,
              protected _expansionDispatcher: UniqueSelectionDispatcher) {
    this._removeUniqueSelectionListener =
      _expansionDispatcher.listen((id: string, accordionId: string) => {
        if (this.accordion && !this.accordion.multi &&
            this.accordion.id === accordionId && this.id !== id) {
          this.expanded = false;
        }
      });

    // When an accordion item is hosted in an accordion, subscribe to open/close events.
    if (this.accordion) {
      this._openCloseAllSubscription = this._subscribeToOpenCloseAllActions();
    }
  }

  /**
   * Emits an event for the accordion item being destroyed.
   *
   * 发出此条目被销毁的事件。
   *
   */
  ngOnDestroy() {
    this.opened.complete();
    this.closed.complete();
    this.destroyed.emit();
    this.destroyed.complete();
    this._removeUniqueSelectionListener();
    this._openCloseAllSubscription.unsubscribe();
  }

  /**
   * Toggles the expanded state of the accordion item.
   *
   * 切换此条目的展开状态。
   *
   */
  toggle(): void {
    if (!this.disabled) {
      this.expanded = !this.expanded;
    }
  }

  /**
   * Sets the expanded state of the accordion item to false.
   *
   * 把此条目的展开状态设置为 false。
   *
   */
  close(): void {
    if (!this.disabled) {
      this.expanded = false;
    }
  }

  /**
   * Sets the expanded state of the accordion item to true.
   *
   * 把此条目的展开状态设置为 true。
   *
   */
  open(): void {
    if (!this.disabled) {
      this.expanded = true;
    }
  }

  private _subscribeToOpenCloseAllActions(): Subscription {
    return this.accordion._openCloseAllActions.subscribe(expanded => {
      // Only change expanded state if item is enabled
      if (!this.disabled) {
        this.expanded = expanded;
      }
    });
  }

  static ngAcceptInputType_expanded: BooleanInput;
  static ngAcceptInputType_disabled: BooleanInput;
}
