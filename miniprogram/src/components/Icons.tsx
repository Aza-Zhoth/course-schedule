import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';

/**
 * 图标集 —— 从 H5 版的 20 个内联 SVG 迁移而来。
 *
 * 为什么要改：微信小程序**不支持 `<svg>` 标签**，内联 SVG 写进 WXML 不会被渲染。
 * 常见做法有三种，这里选了第三种：
 *   1. 每个图标转成 `<Image src="data:image/svg+xml;base64,...">` —— 可靠，但颜色烧死在
 *      图片里，深色模式得生成两套，而且 40 多处调用点全要改成显式传色值；
 *   2. 换字体图标 / 图标库 —— 引入额外依赖，还会撑大包体积；
 *   3. CSS mask + background-color（本方案）—— 图标仍是一段 base64 的 SVG，
 *      但只当 mask 用。mask 只取图形的 alpha 通道，显示颜色来自
 *      `background-color: currentColor`，所以**颜色依然完全由 CSS 的 color 决定**，
 *      主题切换自动生效，所有调用点的写法一个字都不用改。
 *
 * 唯一的取舍：线宽由 icons.css 里那份 SVG 统一决定（1.9），不能再像原来那样
 * 用 strokeWidth 逐处微调。视觉差异可忽略，但 `strokeWidth` 保留在签名里，
 * 免得动到调用点。
 */

interface IconProps {
  size?: number;
  className?: string;
  /** 仅作兼容保留：改用 mask 渲染后线宽由 icons.css 统一控制 */
  strokeWidth?: number;
}

interface NamedIconProps extends IconProps {
  name: string;
}

function Icon({ name, size = 20, className }: NamedIconProps) {
  // 行内样式的 px 不参与 Taro 的 designWidth 换算，必须用 pxTransform 手动转换，
  // 否则在 375 设计稿下尺寸会差一倍。
  const side = Taro.pxTransform(size);
  return (
    <View
      className={className ? `icon icon--${name} ${className}` : `icon icon--${name}`}
      style={{ width: side, height: side }}
    />
  );
}

export function CalendarIcon(props: IconProps) {
  return <Icon name="calendar" {...props} />;
}

export function ClockIcon(props: IconProps) {
  return <Icon name="clock" {...props} />;
}

export function BookIcon(props: IconProps) {
  return <Icon name="book" {...props} />;
}

export function UserIcon(props: IconProps) {
  return <Icon name="user" {...props} />;
}

export function PlusIcon(props: IconProps) {
  return <Icon name="plus" {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <Icon name="settings" {...props} />;
}

export function SunIcon(props: IconProps) {
  return <Icon name="sun" {...props} />;
}

export function MoonIcon(props: IconProps) {
  return <Icon name="moon" {...props} />;
}

export function ChevronLeftIcon(props: IconProps) {
  return <Icon name="chevron-left" {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <Icon name="chevron-right" {...props} />;
}

export function EditIcon(props: IconProps) {
  return <Icon name="edit" {...props} />;
}

export function TrashIcon(props: IconProps) {
  return <Icon name="trash" {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <Icon name="close" {...props} />;
}

export function DownloadIcon(props: IconProps) {
  return <Icon name="download" {...props} />;
}

export function UploadIcon(props: IconProps) {
  return <Icon name="upload" {...props} />;
}

export function MapPinIcon(props: IconProps) {
  return <Icon name="map-pin" {...props} />;
}

export function BellIcon(props: IconProps) {
  return <Icon name="bell" {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Icon name="search" {...props} />;
}

export function InfoIcon(props: IconProps) {
  return <Icon name="info" {...props} />;
}

export function SparkleIcon(props: IconProps) {
  return <Icon name="sparkle" {...props} />;
}
