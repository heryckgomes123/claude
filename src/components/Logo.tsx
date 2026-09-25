import mark from '../assets/brand/mark.webp'
import wordmark from '../assets/brand/wordmark.webp'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { mark: 'h-8', word: 'h-[13px]' },
  md: { mark: 'h-9', word: 'h-[15px]' },
  lg: { mark: 'h-14', word: 'h-6' },
}

/** Logotipo oficial (emblema + wordmark dourados extraídos da arte da marca). */
export function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={mark}
        alt=""
        width={400}
        height={610}
        className={`${sizes[size].mark} w-auto drop-shadow-[0_0_10px_rgb(247_201_72/0.35)]`}
      />
      <img src={wordmark} alt="INTELRA" width={900} height={130} className={`${sizes[size].word} w-auto`} />
    </span>
  )
}
