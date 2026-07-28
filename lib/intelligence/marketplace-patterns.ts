/** Shared marketplace / C2C detection patterns for Intelligence + Discovery. */

export const C2C_MARKETPLACE_PATTERN =
  /productos?\s+usados?|segunda\s+mano|comprar\s+y\s+vender|vender\s+y\s+comprar|entre\s+particulares|particulares\s+venden|personas\s+venden|wallapop|vinted|\bebay\b|c2c|reventa|art[ií]culos\s+usados?|ropa\s+de\s+segunda\s+mano|marketplace\s+de\s+venta|plataforma\s+de\s+venta/i;

export const MARKETPLACE_PATTERN =
  /marketplace|airbnb|uber\s+para|plataforma\s+de\s+(?:venta|conexi[oó]n|reserv)|matching\s+de|conectar\s+(?:oferta|demanda)|vendedores?\s+y\s+compradores?/i;

export function isC2CMarketplaceIdea(text: string): boolean {
  return C2C_MARKETPLACE_PATTERN.test(text.toLowerCase());
}

export function isMarketplaceIdea(text: string): boolean {
  const lower = text.toLowerCase();
  return isC2CMarketplaceIdea(text) || MARKETPLACE_PATTERN.test(lower);
}
