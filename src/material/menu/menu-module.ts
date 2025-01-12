/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCommonModule, MatRippleModule} from '@angular/material/core';
import {CdkScrollableModule} from '@angular/cdk/scrolling';
import {MatMenu} from './menu';
import {MatMenuContent} from './menu-content';
import {MatMenuItem} from './menu-item';
import {MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER, MatMenuTrigger} from './menu-trigger';

/**
 * Used by both the current `MatMenuModule` and the MDC `MatMenuModule`
 * to declare the menu-related directives.
 *
 * 由当前的 `MatMenuModule` 和 MDC 的 `MatMenuModule` 使用，用于声明与菜单相关的指令。
 *
 */
@NgModule({
  exports: [MatMenuTrigger, MatMenuContent, MatCommonModule],
  declarations: [
    MatMenuTrigger,
    MatMenuContent,
  ],
  providers: [MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER]
})
export class _MatMenuDirectivesModule {}

@NgModule({
  imports: [
    CommonModule,
    MatCommonModule,
    MatRippleModule,
    OverlayModule,
    _MatMenuDirectivesModule,
  ],
  exports: [CdkScrollableModule, MatCommonModule, MatMenu, MatMenuItem, _MatMenuDirectivesModule],
  declarations: [MatMenu, MatMenuItem],
  providers: [MAT_MENU_SCROLL_STRATEGY_FACTORY_PROVIDER]
})
export class MatMenuModule {}
