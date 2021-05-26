`MatSnackBar` is a service for displaying snack-bar notifications.

`MatSnackBar` 是一个用来显示快餐栏通知的服务。

<!-- example(snack-bar-overview) -->

### Opening a snack-bar

### 打开快餐栏

A snack-bar can contain either a string message or a given component.

快餐栏可以包含一个字符串消息或指定的组件。

```ts
// Simple message.
let snackBarRef = snackBar.open('Message archived');

// Simple message with an action.
let snackBarRef = snackBar.open('Message archived', 'Undo');

// Load the given component into the snack-bar.
let snackBarRef = snackbar.openFromComponent(MessageArchivedComponent);
```

In either case, a `MatSnackBarRef` is returned. This can be used to dismiss the snack-bar or to
receive notification of when the snack-bar is dismissed. For simple messages with an action, the
`MatSnackBarRef` exposes an observable for when the action is triggered.
If you want to close a custom snack-bar that was opened via `openFromComponent`, from within the
component itself, you can inject the `MatSnackBarRef`.

无论哪种形式，都会返回一个 `MatSnackBarRef`。它可以用来关闭快餐栏或在快餐栏关闭时接收通知。
对于只有一个操作的简单消息，当该动作被触发时，`MatSnackBarRef` 会暴露出一个 `Observable`。
如果你要关闭一个用 `openFromComponent` 打开的自定义快餐栏，可以在该组件中注入一个 `MatSnackBarRef`。

```ts
snackBarRef.afterDismissed().subscribe(() => {
  console.log('The snack-bar was dismissed');
});


snackBarRef.onAction().subscribe(() => {
  console.log('The snack-bar action was triggered!');
});

snackBarRef.dismiss();
```

### Dismissal

### 关闭

A snack-bar can be dismissed manually by calling the `dismiss` method on the `MatSnackBarRef`
returned from the call to `open`.

可以调用由 `open` 调用返回的 `MatSnackBarRef` 中的 `dismiss` 方法来手动关闭快餐栏。

Only one snack-bar can ever be opened at one time. If a new snackbar is opened while a previous
message is still showing, the older message will be automatically dismissed.

同一时刻只能打开一个快餐栏。如果在显示前一个消息时打开一个新的快餐栏，老的消息就会自动关闭。

A snack-bar can also be given a duration via the optional configuration object:

快餐栏还可以通过一个可选的配置对象来指定持续时间：

```ts
snackbar.open('Message archived', 'Undo', {
  duration: 3000
});
```

### Sharing data with a custom snack-bar

### 与自定义快餐栏共享数据

You can share data with the custom snack-bar, that you opened via the `openFromComponent` method,
by passing it through the `data` property.

你可以传入 `data` 属性，来与 `openFromComponent` 打开的自定义快餐栏共享数据。

```ts
snackbar.openFromComponent(MessageArchivedComponent, {
  data: 'some data'
});
```

To access the data in your component, you have to use the `MAT_SNACK_BAR_DATA` injection token:

要在组件中访问该数据，可以使用依赖注入令牌 `MAT_SNACK_BAR_DATA`：

```ts
import {Component, Inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA} from '@angular/material/snack-bar';

@Component({
  selector: 'your-snack-bar',
  template: 'passed in {{ data }}',
})
export class MessageArchivedComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: string) { }
}
```

### Setting the global configuration defaults

### 设置全局配置的默认值

If you want to override the default snack bar options, you can do so using the
`MAT_SNACK_BAR_DEFAULT_OPTIONS` injection token.

如果你要覆盖快餐栏的默认选项，可以使用 `MAT_SNACK_BAR_DEFAULT_OPTIONS` 令牌。

```ts
@NgModule({
  providers: [
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500}}
  ]
})
```

### Accessibility

### 无障碍性

Snack-bar messages are announced via an `aria-live` region. By default, the `polite` setting is
used. While `polite` is recommended, this can be customized by setting the `politeness` property of
the `MatSnackBarConfig`.

快餐栏消息会通过 `aria-live` 进行声明。默认情况下，它会设置为 `polite`。虽然建议使用 `polite`，但是也可以通过设置 `MatSnackBarConfig` 的 `politeness` 属性进行定制。

Focus is not moved to the snack-bar element as that would be disruptive to a user in the middle of a workflow. 
It is recommended that, for any action offered in the snack-bar, the application offers the user an 
alternative way to perform the action.
Alternative interactions are typically keyboard shortcuts or menu options. When the action is
performed in this way, the snack-bar should be dismissed. A snack-bar can contain a single action. 
"Dismiss" or "cancel" actions are optional.

焦点不会自动移到快餐栏元素上，否则会打断用户的工作流。建议的方式是，对于快餐栏中提供的任何操作，
都应该为用户提供一种替代途径来触发 —— 通常会用键盘快捷键或菜单项。当用这些方式执行完之后，应该自动关闭快餐栏。快餐栏可以只包含一个动作。“关闭”或“取消”之类的操作是可选的。

Snack-bars that have an action available should not be given a `duration`, as to accommodate
screen-reader users that want to navigate to the snack-bar element to activate the action. If the
user has manually moved their focus within the snackbar, focus should be placed somewhere sensible
based on the application context when the snack-bar is dismissed.

具有可用动作的快餐栏不应该指定持续时间（`duration`），以支持那些希望导航到快餐栏中进行操作的屏幕阅读器用户。
如果用户手动把焦点移到了快餐栏中，那么当快餐栏关闭时，焦点应该根据应用上下文移到某些有意义的元素上。
