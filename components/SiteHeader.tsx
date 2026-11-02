import { Suspense } from "react";
import SiteHeaderShell from "./SiteHeaderShell";
import HeaderAccount, { HeaderAccountFallback } from "./HeaderAccount";

export default function SiteHeader() {
  return (
    <SiteHeaderShell
      account={
        <Suspense fallback={<HeaderAccountFallback />}>
          <HeaderAccount />
        </Suspense>
      }
    />
  );
}
