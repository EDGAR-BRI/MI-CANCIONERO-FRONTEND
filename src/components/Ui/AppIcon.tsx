import React from 'react';
import { OFFLINE_ICONS } from './icons-bundle';
import { normalizeIconName } from '@/utils/iconMap';

export { normalizeIconName };

export interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
  spin?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  className = '',
  spin = false,
  width: widthProp,
  height: heightProp,
  style,
  ...props
}) => {
  const iconKey = normalizeIconName(name);
  const iconData = OFFLINE_ICONS[iconKey] || OFFLINE_ICONS['fa6-solid:circle-question'];

  const combinedClasses = `${spin ? 'animate-spin ' : ''}${className}`.trim();

  if (!iconData) {
    return null;
  }

  const viewBoxWidth = iconData.width || 512;
  const viewBoxHeight = iconData.height || 512;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={widthProp || '1em'}
      height={heightProp || '1em'}
      className={combinedClasses || undefined}
      fill="currentColor"
      aria-hidden="true"
      style={{
        display: 'inline-block',
        verticalAlign: '-0.125em',
        flexShrink: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: iconData.body }}
      {...props}
    />
  );
};

export default AppIcon;

