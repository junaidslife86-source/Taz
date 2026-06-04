type AppLogoProps = {
  size?: number;
  className?: string;
};

/** Brand mark from /public/Taz.svg */
export function AppLogo({ size = 40, className }: AppLogoProps) {
  return (
    <img
      src="/Taz.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
