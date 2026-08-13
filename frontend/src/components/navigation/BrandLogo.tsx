import type { ComponentPropsWithoutRef } from 'react'

type BrandLogoProps = ComponentPropsWithoutRef<'span'>

export default function BrandLogo({ className, ...props }: BrandLogoProps) {
  return (
    <span className={className} {...props}>
      <img
        className="brand-logo"
        src="/brand/xiaowoniu-logo.webp"
        width="96"
        height="96"
        alt=""
        aria-hidden="true"
      />
      <span>小蜗牛的花花世界</span>
    </span>
  )
}
