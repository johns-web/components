/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injectable, Inject, OnDestroy} from '@angular/core';
import {OverlayContainer} from './overlay-container';
import {DOCUMENT} from '@angular/common';
import {Platform} from '@angular/cdk/platform';

/**
 * Alternative to OverlayContainer that supports correct displaying of overlay elements in
 * Fullscreen mode
 * <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen>
 *
 * OverlayContainer 的替代品，支持在全屏模式（<https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullScreen>）下正确显示浮层元素
 *
 * Should be provided in the root component.
 *
 * 应该在根组件中提供。
 *
 */
@Injectable({providedIn: 'root'})
export class FullscreenOverlayContainer extends OverlayContainer implements OnDestroy {
  private _fullScreenEventName: string | undefined;
  private _fullScreenListener: () => void;

  constructor(@Inject(DOCUMENT) _document: any, platform: Platform) {
    super(_document, platform);
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    if (this._fullScreenEventName && this._fullScreenListener) {
      this._document.removeEventListener(this._fullScreenEventName, this._fullScreenListener);
    }
  }

  protected _createContainer(): void {
    super._createContainer();
    this._adjustParentForFullscreenChange();
    this._addFullscreenChangeListener(() => this._adjustParentForFullscreenChange());
  }

  private _adjustParentForFullscreenChange(): void {
    if (!this._containerElement) {
      return;
    }

    const fullscreenElement = this.getFullscreenElement();
    const parent = fullscreenElement || this._document.body;
    parent.appendChild(this._containerElement);
  }

  private _addFullscreenChangeListener(fn: () => void) {
    const eventName = this._getEventName();

    if (eventName) {
      if (this._fullScreenListener) {
        this._document.removeEventListener(eventName, this._fullScreenListener);
      }

      this._document.addEventListener(eventName, fn);
      this._fullScreenListener = fn;
    }
  }

  private _getEventName(): string | undefined {
    if (!this._fullScreenEventName) {
      const _document = this._document as any;

      if (_document.fullscreenEnabled) {
        this._fullScreenEventName = 'fullscreenchange';
      } else if (_document.webkitFullscreenEnabled) {
        this._fullScreenEventName = 'webkitfullscreenchange';
      } else if (_document.mozFullScreenEnabled) {
        this._fullScreenEventName = 'mozfullscreenchange';
      } else if (_document.msFullscreenEnabled) {
        this._fullScreenEventName = 'MSFullscreenChange';
      }
    }

    return this._fullScreenEventName;
  }

  /**
   * When the page is put into fullscreen mode, a specific element is specified.
   * Only that element and its children are visible when in fullscreen mode.
   *
   * 当页面进入全屏模式时，会指定一个元素。在全屏模式下，只能看到该元素及其子元素。
   *
   */
  getFullscreenElement(): Element {
    const _document = this._document as any;

    return _document.fullscreenElement ||
           _document.webkitFullscreenElement ||
           _document.mozFullScreenElement ||
           _document.msFullscreenElement ||
           null;
  }
}
