const logo = new URL('../assets/tashan-logo.svg', import.meta.url).href;

// Display the graphic mark from the official horizontal logo. The original
// asset stays unmodified; the adjacent navigation label supplies the name.
export default function TashanLogo({ size = 20 }) {
  return <svg className="tw-tashan-logo" width={size} height={size} viewBox="0 0 300 127.57" aria-hidden="true" focusable="false">
    <image href={logo} width="569.23" height="127.57" />
  </svg>;
}
