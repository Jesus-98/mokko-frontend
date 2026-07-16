import { useEffect, useState } from "react";
import {
  FALLBACK_PRICING_CATALOG,
  loadPricingCatalog,
  type PricingCatalog,
} from "../config/pricing";

export function usePricingCatalog() {
  const [catalog, setCatalog] = useState<PricingCatalog>(
    FALLBACK_PRICING_CATALOG
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadPricingCatalog()
      .then((nextCatalog) => {
        if (isMounted) setCatalog(nextCatalog);
      })
      .catch((error) => {
        console.warn(
          "No se pudo cargar el catálogo de precios. Se usará el respaldo local.",
          error
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { catalog, isLoading };
}
