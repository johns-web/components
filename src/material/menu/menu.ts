/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {FocusKeyManager, FocusOrigin} from '@angular/cdk/a11y';
import {Direction} from '@angular/cdk/bidi';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {
  ESCAPE,
  LEFT_ARROW,
  RIGHT_ARROW,
  DOWN_ARROW,
  UP_ARROW,
  hasModifierKey,
} from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  Output,
  TemplateRef,
  QueryList,
  ViewChild,
  ViewEncapsulation,
  OnInit,
} from '@angular/core';
import {merge, Observable, Subject, Subscription} from 'rxjs';
import {startWith, switchMap, take} from 'rxjs/operators';
import {matMenuAnimations} from './menu-animations';
import {MAT_MENU_CONTENT, MatMenuContent} from './menu-content';
import {MenuPositionX, MenuPositionY} from './menu-positions';
import {throwMatMenuInvalidPositionX, throwMatMenuInvalidPositionY} from './menu-errors';
import {MatMenuItem} from './menu-item';
import {MAT_MENU_PANEL, MatMenuPanel} from './menu-panel';
import {AnimationEvent} from '@angular/animations';

/**
 * Default `mat-menu` options that can be overridden.
 *
 * 默认的 `mat-menu` 选项，可以改写它们。
 *
 */
export interface MatMenuDefaultOptions {
  /**
   * The x-axis position of the menu.
   *
   * 菜单的 x 轴位置。
   *
   */
  xPosition: MenuPositionX;

  /**
   * The y-axis position of the menu.
   *
   * 菜单的 y 轴位置。
   *
   */
  yPosition: MenuPositionY;

  /**
   * Whether the menu should overlap the menu trigger.
   *
   * 此菜单是否应该盖住菜单触发器。
   *
   */
  overlapTrigger: boolean;

  /**
   * Class to be applied to the menu's backdrop.
   *
   * 要应用于菜单背景板的类。
   *
   */
  backdropClass: string;

  /**
   * Class or list of classes to be applied to the menu's overlay panel.
   *
   * 要应用于菜单浮层面板的类或类列表。
   *
   */
  overlayPanelClass?: string | string[];

  /**
   * Whether the menu has a backdrop.
   *
   * 菜单是否有背景板。
   *
   */
  hasBackdrop?: boolean;
}

/**
 * Injection token to be used to override the default options for `mat-menu`.
 *
 * 这个注入令牌用来改写 `mat-menu` 的默认选项。
 *
 */
export const MAT_MENU_DEFAULT_OPTIONS =
    new InjectionToken<MatMenuDefaultOptions>('mat-menu-default-options', {
      providedIn: 'root',
      factory: MAT_MENU_DEFAULT_OPTIONS_FACTORY
    });

/** @docs-private */
export function MAT_MENU_DEFAULT_OPTIONS_FACTORY(): MatMenuDefaultOptions {
  return {
    overlapTrigger: false,
    xPosition: 'after',
    yPosition: 'below',
    backdropClass: 'cdk-overlay-transparent-backdrop',
  };
}

let menuPanelUid = 0;

/**
 * Reason why the menu was closed.
 *
 * 菜单被关闭的原因。
 *
 */
export type MenuCloseReason = void | 'click' | 'keydown' | 'tab';


/**
 * Base class with all of the `MatMenu` functionality.
 *
 * 具有所有 `MatMenu` 功能的基类。
 *
 */
@Directive()
export class _MatMenuBase implements AfterContentInit, MatMenuPanel<MatMenuItem>, OnInit,
  OnDestroy {
  private _keyManager: FocusKeyManager<MatMenuItem>;
  private _xPosition: MenuPositionX = this._defaultOptions.xPosition;
  private _yPosition: MenuPositionY = this._defaultOptions.yPosition;
  private _previousElevation: string;
  protected _elevationPrefix: string;
  protected _baseElevation: number;

  /**
   * All items inside the menu. Includes items nested inside another menu.
   *
   * 菜单里面的所有菜单项。包括其嵌套菜单中的菜单项。
   *
   */
  @ContentChildren(MatMenuItem, {descendants: true}) _allItems: QueryList<MatMenuItem>;

  /**
   * Only the direct descendant menu items.
   *
   * 仅包括直接后代的菜单项。
   *
   */
  private _directDescendantItems = new QueryList<MatMenuItem>();

  /**
   * Subscription to tab events on the menu panel
   *
   * 对菜单面板上 tab 事件的订阅
   *
   */
  private _tabSubscription = Subscription.EMPTY;

  /**
   * Config object to be passed into the menu's ngClass
   *
   * 要传给菜单 ngClass 的配置对象
   *
   */
  _classList: {[key: string]: boolean } = {};

  /**
   * Current state of the panel animation.
   *
   * 面板动画的当前状态
   *
   */
  _panelAnimationState: 'void' | 'enter' = 'void';

  /**
   * Emits whenever an animation on the menu completes.
   *
   * 只要菜单上的动画完成，就会发出通知。
   *
   */
  readonly _animationDone = new Subject<AnimationEvent>();

  /**
   * Whether the menu is animating.
   *
   * 菜单是否正在动画中。
   *
   */
  _isAnimating: boolean;

  /**
   * Parent menu of the current menu panel.
   *
   * 当前菜单面板的父菜单。
   *
   */
  parentMenu: MatMenuPanel | undefined;

  /**
   * Layout direction of the menu.
   *
   * 菜单的布局方向。
   *
   */
  direction: Direction;

  /**
   * Class or list of classes to be added to the overlay panel.
   *
   * 类的类或要添加到浮层面板的类列表。
   *
   */
  overlayPanelClass: string|string[] = this._defaultOptions.overlayPanelClass || '';

  /**
   * Class to be added to the backdrop element.
   *
   * 要添加到背景板元素中的类。
   *
   */
  @Input() backdropClass: string = this._defaultOptions.backdropClass;

  /**
   * aria-label for the menu panel.
   *
   * 用于菜单面板的 aria-label。
   *
   */
  @Input('aria-label') ariaLabel: string;

  /**
   * aria-labelledby for the menu panel.
   *
   * 用于菜单面板的 aria-labelledby。
   *
   */
  @Input('aria-labelledby') ariaLabelledby: string;

  /**
   * aria-describedby for the menu panel.
   *
   * 用于菜单面板的 aria-describedby。
   *
   */
  @Input('aria-describedby') ariaDescribedby: string;

  /**
   * Position of the menu in the X axis.
   *
   * 菜单在 X 轴上的位置。
   *
   */
  @Input()
  get xPosition(): MenuPositionX { return this._xPosition; }
  set xPosition(value: MenuPositionX) {
    if (value !== 'before' && value !== 'after' &&
      (typeof ngDevMode === 'undefined' || ngDevMode)) {
      throwMatMenuInvalidPositionX();
    }
    this._xPosition = value;
    this.setPositionClasses();
  }

  /**
   * Position of the menu in the Y axis.
   *
   * 菜单在 Y 轴的位置。
   *
   */
  @Input()
  get yPosition(): MenuPositionY { return this._yPosition; }
  set yPosition(value: MenuPositionY) {
    if (value !== 'above' && value !== 'below' && (typeof ngDevMode === 'undefined' || ngDevMode)) {
      throwMatMenuInvalidPositionY();
    }
    this._yPosition = value;
    this.setPositionClasses();
  }

  /** @docs-private */
  @ViewChild(TemplateRef) templateRef: TemplateRef<any>;

  /**
   * List of the items inside of a menu.
   *
   * 菜单里面的菜单项列表。
   *
   * @deprecated
   * @breaking-change 8.0.0
   */
  @ContentChildren(MatMenuItem, {descendants: false}) items: QueryList<MatMenuItem>;

  /**
   * Menu content that will be rendered lazily.
   *
   * 菜单内容，会惰性渲染。
   *
   * @docs-private
   */
  @ContentChild(MAT_MENU_CONTENT) lazyContent: MatMenuContent;

  /**
   * Whether the menu should overlap its trigger.
   *
   * 菜单是否应遮住其触发器。
   *
   */
  @Input()
  get overlapTrigger(): boolean { return this._overlapTrigger; }
  set overlapTrigger(value: boolean) {
    this._overlapTrigger = coerceBooleanProperty(value);
  }
  private _overlapTrigger: boolean = this._defaultOptions.overlapTrigger;

  /**
   * Whether the menu has a backdrop.
   *
   * 菜单是否有背景板。
   *
   */
  @Input()
  get hasBackdrop(): boolean | undefined { return this._hasBackdrop; }
  set hasBackdrop(value: boolean | undefined) {
    this._hasBackdrop = coerceBooleanProperty(value);
  }
  private _hasBackdrop: boolean | undefined = this._defaultOptions.hasBackdrop;

  /**
   * This method takes classes set on the host mat-menu element and applies them on the
   * menu template that displays in the overlay container.  Otherwise, it's difficult
   * to style the containing menu from outside the component.
   *
   * 此方法会从宿主的 mat-menu 元素中取得一组类，并将它们应用在浮层容器中显示的菜单模板中。否则，将很难从组件外部设置其内部菜单的样式。
   *
   * @param classes list of class names
   *
   * 类名列表
   *
   */
  @Input('class')
  set panelClass(classes: string) {
    const previousPanelClass = this._previousPanelClass;

    if (previousPanelClass && previousPanelClass.length) {
      previousPanelClass.split(' ').forEach((className: string) => {
        this._classList[className] = false;
      });
    }

    this._previousPanelClass = classes;

    if (classes && classes.length) {
      classes.split(' ').forEach((className: string) => {
        this._classList[className] = true;
      });

      this._elementRef.nativeElement.className = '';
    }
  }
  private _previousPanelClass: string;

  /**
   * This method takes classes set on the host mat-menu element and applies them on the
   * menu template that displays in the overlay container.  Otherwise, it's difficult
   * to style the containing menu from outside the component.
   *
   * 此方法会从宿主的 mat-menu 元素中取得一组类，并将它们应用在浮层容器中显示的菜单模板中。否则，将很难从组件外部设置其内部菜单的样式。
   *
   * @deprecated Use `panelClass` instead.
   *
   * 请改用 `panelClass`。
   *
   * @breaking-change 8.0.0
   */
  @Input()
  get classList(): string { return this.panelClass; }
  set classList(classes: string) { this.panelClass = classes; }

  /**
   * Event emitted when the menu is closed.
   *
   * 当菜单关闭时会发出本事件。
   *
   */
  @Output() readonly closed: EventEmitter<MenuCloseReason> = new EventEmitter<MenuCloseReason>();

  /**
   * Event emitted when the menu is closed.
   *
   * 当菜单关闭时会发出本事件。
   *
   * @deprecated Switch to `closed` instead
   *
   * 切换到 `closed`
   * @breaking-change 8.0.0
   */
  @Output() readonly close: EventEmitter<MenuCloseReason> = this.closed;

  readonly panelId = `mat-menu-panel-${menuPanelUid++}`;

  constructor(
    private _elementRef: ElementRef<HTMLElement>,
    private _ngZone: NgZone,
    @Inject(MAT_MENU_DEFAULT_OPTIONS) private _defaultOptions: MatMenuDefaultOptions) { }

  ngOnInit() {
    this.setPositionClasses();
  }

  ngAfterContentInit() {
    this._updateDirectDescendants();
    this._keyManager = new FocusKeyManager(this._directDescendantItems)
      .withWrap()
      .withTypeAhead()
      .withHomeAndEnd();
    this._tabSubscription = this._keyManager.tabOut.subscribe(() => this.closed.emit('tab'));

    // If a user manually (programmatically) focuses a menu item, we need to reflect that focus
    // change back to the key manager. Note that we don't need to unsubscribe here because _focused
    // is internal and we know that it gets completed on destroy.
    this._directDescendantItems.changes.pipe(
      startWith(this._directDescendantItems),
      switchMap(items => merge(...items.map((item: MatMenuItem) => item._focused)))
    ).subscribe(focusedItem => this._keyManager.updateActiveItem(focusedItem as MatMenuItem));
  }

  ngOnDestroy() {
    this._directDescendantItems.destroy();
    this._tabSubscription.unsubscribe();
    this.closed.complete();
  }

  /**
   * Stream that emits whenever the hovered menu item changes.
   *
   * 当菜单项的悬停状态发生变化时会发出通知的流。
   *
   */
  _hovered(): Observable<MatMenuItem> {
    // Coerce the `changes` property because Angular types it as `Observable<any>`
    const itemChanges = this._directDescendantItems.changes as Observable<QueryList<MatMenuItem>>;
    return itemChanges.pipe(
      startWith(this._directDescendantItems),
      switchMap(items => merge(...items.map((item: MatMenuItem) => item._hovered)))
    ) as Observable<MatMenuItem>;
  }

  /*
   * Registers a menu item with the menu.
   * @docs-private
   * @deprecated No longer being used. To be removed.
   * @breaking-change 9.0.0
   */
  addItem(_item: MatMenuItem) {}

  /**
   * Removes an item from the menu.
   *
   * 从菜单中删除一个菜单项。
   *
   * @docs-private
   * @deprecated No longer being used. To be removed.
   *
   * 不用了。将来会删除
   * @breaking-change 9.0.0
   */
  removeItem(_item: MatMenuItem) {}

  /**
   * Handle a keyboard event from the menu, delegating to the appropriate action.
   *
   * 从菜单中处理一个键盘事件，委托给相应的动作。
   *
   */
  _handleKeydown(event: KeyboardEvent) {
    const keyCode = event.keyCode;
    const manager = this._keyManager;

    switch (keyCode) {
      case ESCAPE:
        if (!hasModifierKey(event)) {
          event.preventDefault();
          this.closed.emit('keydown');
        }
      break;
      case LEFT_ARROW:
        if (this.parentMenu && this.direction === 'ltr') {
          this.closed.emit('keydown');
        }
      break;
      case RIGHT_ARROW:
        if (this.parentMenu && this.direction === 'rtl') {
          this.closed.emit('keydown');
        }
      break;
      default:
        if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
          manager.setFocusOrigin('keyboard');
        }

        manager.onKeydown(event);
    }
  }

  /**
   * Focus the first item in the menu.
   *
   * 让菜单中的第一项获得焦点。
   *
   * @param origin Action from which the focus originated. Used to set the correct styling.
   *
   * 导致获得焦点的动作来源。用来设置正确的样式。
   *
   */
  focusFirstItem(origin: FocusOrigin = 'program'): void {
    // When the content is rendered lazily, it takes a bit before the items are inside the DOM.
    if (this.lazyContent) {
      this._ngZone.onStable
        .pipe(take(1))
        .subscribe(() => this._focusFirstItem(origin));
    } else {
      this._focusFirstItem(origin);
    }
  }

  /**
   * Actual implementation that focuses the first item. Needs to be separated
   * out so we don't repeat the same logic in the public `focusFirstItem` method.
   *
   * 让第一项获得焦点的实际实现。要把它分离出去，所以我们不会在公开的 `focusFirstItem` 方法中重复相同的逻辑。
   *
   */
  private _focusFirstItem(origin: FocusOrigin) {
    const manager = this._keyManager;

    manager.setFocusOrigin(origin).setFirstItemActive();

    // If there's no active item at this point, it means that all the items are disabled.
    // Move focus to the menu panel so keyboard events like Escape still work. Also this will
    // give _some_ feedback to screen readers.
    if (!manager.activeItem && this._directDescendantItems.length) {
      let element = this._directDescendantItems.first._getHostElement().parentElement;

      // Because the `mat-menu` is at the DOM insertion point, not inside the overlay, we don't
      // have a nice way of getting a hold of the menu panel. We can't use a `ViewChild` either
      // because the panel is inside an `ng-template`. We work around it by starting from one of
      // the items and walking up the DOM.
      while (element) {
        if (element.getAttribute('role') === 'menu') {
          element.focus();
          break;
        } else {
          element = element.parentElement;
        }
      }
    }
  }

  /**
   * Resets the active item in the menu. This is used when the menu is opened, allowing
   * the user to start from the first option when pressing the down arrow.
   *
   * 重置菜单中的活动菜单项。这会在打开菜单时使用，允许用户当按下向下箭头时从第一个菜单项开始。
   *
   */
  resetActiveItem() {
    this._keyManager.setActiveItem(-1);
  }

  /**
   * Sets the menu panel elevation.
   *
   * 设置菜单面板的纵深。
   *
   * @param depth Number of parent menus that come before the menu.
   *
   * 本菜单前的父菜单数量。
   *
   */
  setElevation(depth: number): void {
    // The elevation starts at the base and increases by one for each level.
    // Capped at 24 because that's the maximum elevation defined in the Material design spec.
    const elevation = Math.min(this._baseElevation + depth, 24);
    const newElevation = `${this._elevationPrefix}${elevation}`;
    const customElevation = Object.keys(this._classList).find(className => {
      return className.startsWith(this._elevationPrefix);
    });

    if (!customElevation || customElevation === this._previousElevation) {
      if (this._previousElevation) {
        this._classList[this._previousElevation] = false;
      }

      this._classList[newElevation] = true;
      this._previousElevation = newElevation;
    }
  }

  /**
   * Adds classes to the menu panel based on its position. Can be used by
   * consumers to add specific styling based on the position.
   *
   * 根据菜单面板的位置，把一些类添加到菜单面板中。消费者可以根据位置添加具体的样式。
   *
   * @param posX Position of the menu along the x axis.
   *
   * 菜单沿 x 轴的位置。
   *
   * @param posY Position of the menu along the y axis.
   *
   * 菜单沿 y 轴的位置。
   *
   * @docs-private
   */
  setPositionClasses(posX: MenuPositionX = this.xPosition, posY: MenuPositionY = this.yPosition) {
    const classes = this._classList;
    classes['mat-menu-before'] = posX === 'before';
    classes['mat-menu-after'] = posX === 'after';
    classes['mat-menu-above'] = posY === 'above';
    classes['mat-menu-below'] = posY === 'below';
  }

  /**
   * Starts the enter animation.
   *
   * 启动入场动画。
   *
   */
  _startAnimation() {
    // @breaking-change 8.0.0 Combine with _resetAnimation.
    this._panelAnimationState = 'enter';
  }

  /**
   * Resets the panel animation to its initial state.
   *
   * 把面板动画重启为其初始状态。
   *
   */
  _resetAnimation() {
    // @breaking-change 8.0.0 Combine with _startAnimation.
    this._panelAnimationState = 'void';
  }

  /**
   * Callback that is invoked when the panel animation completes.
   *
   * 面板动画完成后调用的回调函数
   *
   */
  _onAnimationDone(event: AnimationEvent) {
    this._animationDone.next(event);
    this._isAnimating = false;
  }

  _onAnimationStart(event: AnimationEvent) {
    this._isAnimating = true;

    // Scroll the content element to the top as soon as the animation starts. This is necessary,
    // because we move focus to the first item while it's still being animated, which can throw
    // the browser off when it determines the scroll position. Alternatively we can move focus
    // when the animation is done, however moving focus asynchronously will interrupt screen
    // readers which are in the process of reading out the menu already. We take the `element`
    // from the `event` since we can't use a `ViewChild` to access the pane.
    if (event.toState === 'enter' && this._keyManager.activeItemIndex === 0) {
      event.element.scrollTop = 0;
    }
  }

  /**
   * Sets up a stream that will keep track of any newly-added menu items and will update the list
   * of direct descendants. We collect the descendants this way, because `_allItems` can include
   * items that are part of child menus, and using a custom way of registering items is unreliable
   * when it comes to maintaining the item order.
   *
   * 设置一个流，它会跟踪任何新添加的菜单项，并会更新其直接后代的列表。我们通过这种方式收集后代，因为 `_allItems` 可以包含那些作为子菜单一部分的菜单项。在维护菜单项顺序方面，使用自定义方式注册菜单项是不可靠的。
   *
   */
  private _updateDirectDescendants() {
    this._allItems.changes
      .pipe(startWith(this._allItems))
      .subscribe((items: QueryList<MatMenuItem>) => {
        this._directDescendantItems.reset(items.filter(item => item._parentMenu === this));
        this._directDescendantItems.notifyOnChanges();
      });
  }

  static ngAcceptInputType_overlapTrigger: BooleanInput;
  static ngAcceptInputType_hasBackdrop: BooleanInput;
}

/** @docs-public MatMenu */
@Component({
  selector: 'mat-menu',
  templateUrl: 'menu.html',
  styleUrls: ['menu.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'matMenu',
  host: {
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
  },
  animations: [
    matMenuAnimations.transformMenu,
    matMenuAnimations.fadeInItems
  ],
  providers: [
    {provide: MAT_MENU_PANEL, useExisting: MatMenu},
  ]
})
export class MatMenu extends _MatMenuBase {
  protected _elevationPrefix = 'mat-elevation-z';
  protected _baseElevation = 4;

  constructor(elementRef: ElementRef<HTMLElement>, ngZone: NgZone,
      @Inject(MAT_MENU_DEFAULT_OPTIONS) defaultOptions: MatMenuDefaultOptions) {
    super(elementRef, ngZone, defaultOptions);
  }
}
