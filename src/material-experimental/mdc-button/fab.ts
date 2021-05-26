/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Platform} from '@angular/cdk/platform';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  InjectionToken,
  NgZone,
  Optional,
  ViewEncapsulation
} from '@angular/core';
import {ANIMATION_MODULE_TYPE} from '@angular/platform-browser/animations';

import {MatAnchor} from './button';
import {
  MAT_ANCHOR_HOST,
  MAT_ANCHOR_INPUTS,
  MAT_BUTTON_HOST,
  MAT_BUTTON_INPUTS,
  MatButtonBase
} from './button-base';
import {ThemePalette} from '@angular/material-experimental/mdc-core';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';


/** Default FAB options that can be overridden. */
export interface MatFabDefaultOptions {
  color?: ThemePalette;
}

/** Injection token to be used to override the default options for FAB. */
export const MAT_FAB_DEFAULT_OPTIONS =
  new InjectionToken<MatFabDefaultOptions>('mat-mdc-fab-default-options', {
    providedIn: 'root',
    factory: MAT_FAB_DEFAULT_OPTIONS_FACTORY
  });

/** @docs-private */
export function MAT_FAB_DEFAULT_OPTIONS_FACTORY(): MatFabDefaultOptions {
  return {
    // The FAB by default has its color set to accent.
    color: 'accent',
  };
}

// Default FAB configuration.
const defaults = MAT_FAB_DEFAULT_OPTIONS_FACTORY();

/**
 * Material Design floating action button (FAB) component. These buttons represent the primary
 * or most common action for users to interact with.
 * See https://material.io/components/buttons-floating-action-button/
 *
 * The `MatFabButton` class has two appearances: normal and extended.
 */
@Component({
  selector: `button[mat-fab]`,
  templateUrl: 'button.html',
  styleUrls: ['fab.css'],
  // TODO: change to MAT_BUTTON_INPUTS/MAT_BUTTON_HOST with spread after ViewEngine is deprecated
  inputs: ['disabled', 'disableRipple', 'color', 'extended'],
  host: {
    '[class.mdc-fab--extended]': 'extended',
    '[class.mat-mdc-extended-fab]': 'extended',
    '[attr.disabled]': 'disabled || null',
    '[class._mat-animation-noopable]': '_animationMode === "NoopAnimations"',
    // MDC automatically applies the primary theme color to the button, but we want to support
    // an unthemed version. If color is undefined, apply a CSS class that makes it easy to
    // select and style this "theme".
    '[class.mat-unthemed]': '!color',
    // Add a class that applies to all buttons. This makes it easier to target if somebody
    // wants to target all Material buttons.
    '[class.mat-mdc-button-base]': 'true',
  },
  exportAs: 'matButton',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatFabButton extends MatButtonBase {
  _isFab = true;

  private _extended: boolean;
  get extended(): boolean { return this._extended; }
  set extended(value: boolean) { this._extended = coerceBooleanProperty(value); }

  constructor(
      elementRef: ElementRef, platform: Platform, ngZone: NgZone,
      @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
      @Optional() @Inject(MAT_FAB_DEFAULT_OPTIONS) private _options?: MatFabDefaultOptions) {
    super(elementRef, platform, ngZone, animationMode);
    this._options = this._options || defaults;
    this.color = this.defaultColor = this._options!.color || defaults.color;
  }

  static ngAcceptInputType_extended: BooleanInput;
}

/**
 * Material Design mini floating action button (FAB) component. These buttons represent the primary
 * or most common action for users to interact with.
 * See https://material.io/components/buttons-floating-action-button/
 */
@Component({
  selector: `button[mat-mini-fab]`,
  templateUrl: 'button.html',
  styleUrls: ['fab.css'],
  inputs: MAT_BUTTON_INPUTS,
  host: MAT_BUTTON_HOST,
  exportAs: 'matButton',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatMiniFabButton extends MatButtonBase {
  _isFab = true;

  constructor(
    elementRef: ElementRef, platform: Platform, ngZone: NgZone,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
    @Optional() @Inject(MAT_FAB_DEFAULT_OPTIONS) private _options?: MatFabDefaultOptions) {
    super(elementRef, platform, ngZone, animationMode);
    this._options = this._options || defaults;
    this.color = this.defaultColor = this._options!.color || defaults.color;
  }
}


/**
 * Material Design floating action button (FAB) component for anchor elements. Anchor elements
 * are used to provide links for the user to navigate across different routes or pages.
 * See https://material.io/components/buttons-floating-action-button/
 *
 * The `MatFabAnchor` class has two appearances: normal and extended.
 */
@Component({
  selector: `a[mat-fab]`,
  templateUrl: 'button.html',
  styleUrls: ['fab.css'],
  // TODO: change to MAT_ANCHOR_INPUTS/MAT_ANCHOR_HOST with spread after ViewEngine is deprecated
  inputs: ['disabled', 'disableRipple', 'color', 'tabIndex', 'extended'],
  host: {
    '[class.mdc-fab--extended]': 'extended',
    '[class.mat-mdc-extended-fab]': 'extended',
    '[attr.disabled]': 'disabled || null',
    '[class._mat-animation-noopable]': '_animationMode === "NoopAnimations"',

    // Note that we ignore the user-specified tabindex when it's disabled for
    // consistency with the `mat-button` applied on native buttons where even
    // though they have an index, they're not tabbable.
    '[attr.tabindex]': 'disabled ? -1 : (tabIndex || 0)',
    '[attr.aria-disabled]': 'disabled.toString()',
    // MDC automatically applies the primary theme color to the button, but we want to support
    // an unthemed version. If color is undefined, apply a CSS class that makes it easy to
    // select and style this "theme".
    '[class.mat-unthemed]': '!color',
    // Add a class that applies to all buttons. This makes it easier to target if somebody
    // wants to target all Material buttons.
    '[class.mat-mdc-button-base]': 'true',
  },
  exportAs: 'matButton, matAnchor',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatFabAnchor extends MatAnchor {
  _isFab = true;

  private _extended: boolean;
  get extended(): boolean { return this._extended; }
  set extended(value: boolean) { this._extended = coerceBooleanProperty(value); }


  constructor(
      elementRef: ElementRef, platform: Platform, ngZone: NgZone,
      @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
      @Optional() @Inject(MAT_FAB_DEFAULT_OPTIONS) private _options?: MatFabDefaultOptions) {
    super(elementRef, platform, ngZone, animationMode);
    this._options = this._options || defaults;
    this.color = this.defaultColor = this._options!.color || defaults.color;
  }

  static ngAcceptInputType_extended: BooleanInput;
}

/**
 * Material Design mini floating action button (FAB) component for anchor elements. Anchor elements
 * are used to provide links for the user to navigate across different routes or pages.
 * See https://material.io/components/buttons-floating-action-button/
 */
@Component({
  selector: `a[mat-mini-fab]`,
  templateUrl: 'button.html',
  styleUrls: ['fab.css'],
  inputs: MAT_ANCHOR_INPUTS,
  host: MAT_ANCHOR_HOST,
  exportAs: 'matButton, matAnchor',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatMiniFabAnchor extends MatAnchor {
  _isFab = true;

  constructor(
    elementRef: ElementRef, platform: Platform, ngZone: NgZone,
    @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
    @Optional() @Inject(MAT_FAB_DEFAULT_OPTIONS) private _options?: MatFabDefaultOptions) {
    super(elementRef, platform, ngZone, animationMode);
    this._options = this._options || defaults;
    this.color = this.defaultColor = this._options!.color || defaults.color;
  }
}
