# Brand — FHIS

## Identidad

| Propiedad | Valor |
|-----------|-------|
| Nombre | ForgeOS |
| Nombre corto | Forge |
| Tagline | Venture Studio |
| Sistema | FHIS |
| Nombre completo | Forge Human Interface System |
| Versión | 0.4 |

## Uso en código

```tsx
import { brand } from "@/lib/design-system";
import { BrandDisplay } from "@/components/ui/fhis";

// Token
console.log(brand.name); // "ForgeOS"

// Componente
<BrandDisplay showSystem />
```

## CSS Variables

```css
--fhis-brand-name: "ForgeOS";
--fhis-system: "FHIS";
--fhis-version: "0.4";
```

## Reglas

- Usar `BrandDisplay` para mostrar la marca en contextos de sistema
- No modificar colores de marca sin actualizar tokens
- El acento lime (`#a3e635`) es el color primario de ForgeOS
