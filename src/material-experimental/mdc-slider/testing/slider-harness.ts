/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ComponentHarness, HarnessPredicate} from '@angular/cdk/testing';
import {coerceNumberProperty} from '@angular/cdk/coercion';
import {SliderHarnessFilters, ThumbPosition} from './slider-harness-filters';
import {MatSliderThumbHarness} from './slider-thumb-harness';

/** Harness for interacting with a MDC mat-slider in tests. */
export class MatSliderHarness extends ComponentHarness {
  static hostSelector = '.mat-mdc-slider';

  /**
   * Gets a `HarnessPredicate` that can be used to search for a `MatSliderHarness` that meets
   * certain criteria.
   * @param options Options for filtering which input instances are considered a match.
   * @return a `HarnessPredicate` configured with the given options.
   *
   * 用指定选项配置过的 `HarnessPredicate` 服务。
   */
  static with(options: SliderHarnessFilters = {}): HarnessPredicate<MatSliderHarness> {
    return new HarnessPredicate(MatSliderHarness, options)
      .addOption('isRange', options.isRange, async (harness, value) => {
        return (await harness.isRange()) === value;
      });
  }

  /** Gets the start/primary thumb of the slider. */
  async getStartThumb(): Promise<MatSliderThumbHarness> {
    return this.locatorFor(MatSliderThumbHarness.with({position: ThumbPosition.START}))();
  }

  /** Gets the end thumb of the slider. Will throw an error for a non-range slider. */
  async getEndThumb(): Promise<MatSliderThumbHarness> {
    return this.locatorFor(MatSliderThumbHarness.with({position: ThumbPosition.END}))();
  }

  /** Gets whether the slider is a range slider. */
  async isRange(): Promise<boolean> {
    return (await (await this.host()).hasClass('mdc-slider--range'));
  }

  /** Gets whether the slider is disabled. */
  async isDisabled(): Promise<boolean> {
    return (await (await this.host()).hasClass('mdc-slider--disabled'));
  }

  /** Gets the value step increments of the slider. */
  async getStep(): Promise<number> {
    // The same step value is forwarded to both thumbs.
    const startHost = await (await this.getStartThumb()).host();
    return coerceNumberProperty(await startHost.getProperty('step'));
  }

  /** Gets the maximum value of the slider. */
  async getMaxValue(): Promise<number> {
    const endThumb = await this.isRange() ? await this.getEndThumb() : await this.getStartThumb();
    return endThumb.getMaxValue();
  }

  /** Gets the minimum value of the slider. */
  async getMinValue(): Promise<number> {
    return (await this.getStartThumb()).getMinValue();
  }
}
