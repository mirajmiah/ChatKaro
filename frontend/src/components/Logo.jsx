import React from 'react';

// Exact vector path data matching the ChatKaro interlocking speech bubble logo
const BUBBLE_TOP =
  'M 218.0,125.0 L 611.0,125.0 L 626.0,128.0 L 641.0,133.0 L 653.0,139.0 L 668.0,150.0 L 680.0,162.0 L 690.0,176.0 L 698.0,192.0 L 705.0,220.0 L 705.0,303.0 L 703.0,307.0 L 698.0,311.0 L 636.0,311.0 L 632.0,308.0 L 629.0,302.0 L 629.0,226.0 L 624.0,214.0 L 613.0,204.0 L 606.0,201.0 L 601.0,201.0 L 600.0,200.0 L 229.0,200.0 L 221.0,202.0 L 215.0,205.0 L 207.0,212.0 L 203.0,218.0 L 200.0,228.0 L 200.0,470.0 L 205.0,483.0 L 214.0,492.0 L 225.0,497.0 L 525.0,497.0 L 526.0,498.0 L 532.0,498.0 L 546.0,505.0 L 603.0,550.0 L 628.0,568.0 L 629.0,567.0 L 629.0,466.0 L 631.0,461.0 L 635.0,457.0 L 638.0,456.0 L 696.0,456.0 L 700.0,458.0 L 704.0,462.0 L 705.0,465.0 L 705.0,639.0 L 702.0,650.0 L 695.0,662.0 L 683.0,672.0 L 673.0,676.0 L 659.0,678.0 L 644.0,675.0 L 634.0,670.0 L 629.0,665.0 L 595.0,640.0 L 590.0,635.0 L 509.0,573.0 L 223.0,573.0 L 222.0,572.0 L 214.0,572.0 L 205.0,570.0 L 183.0,562.0 L 163.0,549.0 L 149.0,535.0 L 141.0,524.0 L 132.0,507.0 L 128.0,495.0 L 125.0,480.0 L 125.0,217.0 L 128.0,202.0 L 138.0,178.0 L 147.0,165.0 L 159.0,152.0 L 169.0,144.0 L 186.0,134.0 L 203.0,128.0 L 217.0,126.0 Z';

const BUBBLE_BOTTOM =
  'M 421.0,345.0 L 790.0,345.0 L 791.0,346.0 L 794.0,345.0 L 795.0,346.0 L 807.0,346.0 L 830.0,352.0 L 850.0,362.0 L 863.0,372.0 L 872.0,381.0 L 885.0,399.0 L 894.0,419.0 L 899.0,442.0 L 899.0,696.0 L 898.0,697.0 L 896.0,715.0 L 891.0,729.0 L 881.0,748.0 L 872.0,759.0 L 857.0,773.0 L 845.0,781.0 L 830.0,788.0 L 808.0,794.0 L 797.0,794.0 L 796.0,795.0 L 528.0,795.0 L 527.0,794.0 L 519.0,794.0 L 514.0,795.0 L 384.0,895.0 L 371.0,899.0 L 355.0,899.0 L 344.0,896.0 L 333.0,889.0 L 326.0,882.0 L 321.0,874.0 L 318.0,863.0 L 318.0,853.0 L 317.0,852.0 L 318.0,850.0 L 318.0,624.0 L 317.0,619.0 L 322.0,610.0 L 332.0,608.0 L 378.0,608.0 L 379.0,609.0 L 389.0,610.0 L 394.0,617.0 L 394.0,786.0 L 395.0,787.0 L 398.0,787.0 L 401.0,785.0 L 406.0,780.0 L 414.0,775.0 L 433.0,759.0 L 441.0,754.0 L 442.0,752.0 L 471.0,731.0 L 476.0,726.0 L 493.0,718.0 L 797.0,718.0 L 800.0,716.0 L 803.0,716.0 L 811.0,711.0 L 818.0,703.0 L 822.0,693.0 L 822.0,447.0 L 819.0,438.0 L 812.0,430.0 L 805.0,425.0 L 793.0,422.0 L 421.0,422.0 L 412.0,425.0 L 403.0,431.0 L 397.0,439.0 L 394.0,449.0 L 394.0,457.0 L 388.0,464.0 L 383.0,465.0 L 328.0,465.0 L 324.0,464.0 L 318.0,458.0 L 317.0,454.0 L 318.0,438.0 L 322.0,420.0 L 327.0,407.0 L 329.0,405.0 L 332.0,397.0 L 341.0,385.0 L 362.0,365.0 L 379.0,355.0 L 400.0,348.0 L 410.0,346.0 L 420.0,346.0 Z';

/**
 * Dynamic theme-aware ChatKaro App Logo component.
 *
 * Automatically adapts colors to the active DaisyUI theme:
 * - Top speech bubble: uses the theme's primary color (`text-primary` / `--p`)
 * - Bottom speech bubble: uses the theme's secondary color (`text-secondary` / `--s`)
 *
 * Supports optional `primaryColor` and `secondaryColor` overrides or custom class names.
 */
export default function Logo({
  className = 'h-8 w-8',
  primaryClassName = 'text-primary',
  secondaryClassName = 'text-secondary',
  primaryColor,
  secondaryColor,
  ...props
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Top Bubble (Primary theme color) */}
      <path
        d={BUBBLE_TOP}
        className={`${primaryClassName} transition-colors duration-300`}
        style={primaryColor ? { color: primaryColor } : undefined}
        fill="currentColor"
      />
      {/* Bottom Bubble (Secondary theme color) */}
      <path
        d={BUBBLE_BOTTOM}
        className={`${secondaryClassName} transition-colors duration-300`}
        style={secondaryColor ? { color: secondaryColor } : undefined}
        fill="currentColor"
      />
    </svg>
  );
}
