type AppLogoProps = {
  size?: number;
  className?: string;
};

/** Brand mark from /public/Taz.png */
export function AppLogo({ size = 40, className }: AppLogoProps) {
  return (
    <img
      src="/Taz.png"
      alt=""
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
