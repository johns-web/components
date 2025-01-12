/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Observable, isObservable} from 'rxjs';
import {take, filter} from 'rxjs/operators';
import {BaseTreeControl} from './base-tree-control';

/**
 * Optional set of configuration that can be provided to the NestedTreeControl.
 *
 * 可以提供给 NestedTreeControl 的一组可选配置。
 *
 */
export interface NestedTreeControlOptions<T, K> {
  trackBy?: (dataNode: T) => K;
}

/**
 * Nested tree control. Able to expand/collapse a subtree recursively for NestedNode type.
 *
 * 嵌套树控件。能够递归地扩展/折叠 NestedNode 类型的子树。
 *
 */
export class NestedTreeControl<T, K = T> extends BaseTreeControl<T, K> {
  /**
   * Construct with nested tree function getChildren.
   *
   * 使用嵌套树函数 getChildren 构造。
   *
   */
  constructor(
      public getChildren: (dataNode: T) => (Observable<T[]>| T[] | undefined | null),
      public options?: NestedTreeControlOptions<T, K>) {
    super();

    if (this.options) {
      this.trackBy = this.options.trackBy;
    }
  }

  /**
   * Expands all dataNodes in the tree.
   *
   * 展开树中的所有 dataNodes。
   *
   * To make this working, the `dataNodes` variable of the TreeControl must be set to all root level
   * data nodes of the tree.
   *
   * 为了使它起作用，`dataNodes` 变量必须设置为树的所有根级数据节点。
   *
   */
  expandAll(): void {
    this.expansionModel.clear();
    const allNodes = this.dataNodes.reduce((accumulator: T[], dataNode) =>
        [...accumulator, ...this.getDescendants(dataNode), dataNode], []);
    this.expansionModel.select(...allNodes.map(node => this._trackByValue(node)));
  }

  /**
   * Gets a list of descendant dataNodes of a subtree rooted at given data node recursively.
   *
   * 递归获取以给定数据节点为根的子树的后代 dataNode 列表。
   *
   */
  getDescendants(dataNode: T): T[] {
    const descendants: T[] = [];

    this._getDescendants(descendants, dataNode);
    // Remove the node itself
    return descendants.splice(1);
  }

  /**
   * A helper function to get descendants recursively.
   *
   * 以递归方式获取后代的辅助函数。
   *
   */
  protected _getDescendants(descendants: T[], dataNode: T): void {
    descendants.push(dataNode);
    const childrenNodes = this.getChildren(dataNode);
    if (Array.isArray(childrenNodes)) {
      childrenNodes.forEach((child: T) => this._getDescendants(descendants, child));
    } else if (isObservable(childrenNodes)) {
      // TypeScript as of version 3.5 doesn't seem to treat `Boolean` like a function that
      // returns a `boolean` specifically in the context of `filter`, so we manually clarify that.
      childrenNodes.pipe(take(1), filter(Boolean as () => boolean))
          .subscribe(children => {
            for (const child of children) {
              this._getDescendants(descendants, child);
            }
          });
    }
  }
}
