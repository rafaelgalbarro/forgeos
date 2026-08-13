/**
 * European index constituents (Yahoo suffixes) for IBKR Europe accounts.
 * Static lists — no paid data. Refresh via SCAN_UNIVERSE=ALL daily cache.
 */

export const IBEX35: readonly string[] = [
  "ANA.MC", "ACX.MC", "ACS.MC", "AENA.MC", "AMS.MC", "MTS.MC", "SAB.MC", "SAN.MC",
  "BKT.MC", "BBVA.MC", "CABK.MC", "CLNX.MC", "ENG.MC", "ELE.MC", "FER.MC", "GRF.MC",
  "IAG.MC", "IBE.MC", "IDR.MC", "ITX.MC", "COL.MC", "MAP.MC", "MEL.MC", "MRL.MC",
  "NTGY.MC", "RED.MC", "REP.MC", "SLR.MC", "TEF.MC", "UNI.MC", "VIS.MC", "LOG.MC",
  "FDR.MC", "ROVI.MC", "ANE.MC",
];

export const DAX40: readonly string[] = [
  "ADS.DE", "AIR.DE", "ALV.DE", "BAS.DE", "BAYN.DE", "BEI.DE", "BMW.DE", "BNR.DE",
  "CBK.DE", "CON.DE", "1COV.DE", "DTG.DE", "DBK.DE", "DB1.DE", "DHL.DE", "DTE.DE",
  "EOAN.DE", "FRE.DE", "HNR1.DE", "HEI.DE", "HEN3.DE", "IFX.DE", "MBG.DE", "MRK.DE",
  "MTX.DE", "MUV2.DE", "P911.DE", "PAH3.DE", "QIA.DE", "RHM.DE", "RWE.DE", "SAP.DE",
  "SRT3.DE", "SIE.DE", "ENR.DE", "SHL.DE", "SY1.DE", "VOW3.DE", "VNA.DE", "ZAL.DE",
];

export const CAC40: readonly string[] = [
  "AI.PA", "AIR.PA", "ALO.PA", "MT.PA", "CS.PA", "BNP.PA", "EN.PA", "CAP.PA",
  "CA.PA", "ACA.PA", "BN.PA", "DSY.PA", "EDEN.PA", "ENGI.PA", "EL.PA", "ERF.PA",
  "RMS.PA", "KER.PA", "OR.PA", "LR.PA", "MC.PA", "ML.PA", "ORA.PA", "RI.PA",
  "PUB.PA", "RNO.PA", "SAF.PA", "SGO.PA", "SAN.PA", "SU.PA", "GLE.PA", "STLAP.PA",
  "STMPA.PA", "TEP.PA", "HO.PA", "TTE.PA", "URW.PA", "VIE.PA", "DG.PA", "VIV.PA",
];

export const FTSE100: readonly string[] = [
  "AAL.L", "ABF.L", "ADM.L", "AHT.L", "ANTO.L", "AUTO.L", "AV.L", "AZN.L",
  "BA.L", "BARC.L", "BATS.L", "BDEV.L", "BEZ.L", "BKG.L", "BP.L", "BTRW.L",
  "BT-A.L", "CCH.L", "CPG.L", "CRDA.L", "DCC.L", "DGE.L", "DPLM.L", "EDV.L",
  "ENT.L", "EXPN.L", "FCIT.L", "FLTR.L", "FRAS.L", "GLEN.L", "GSK.L", "HIK.L",
  "HLMA.L", "HLN.L", "HSBA.L", "IHG.L", "IMB.L", "INF.L", "ITRK.L", "IAG.L",
  "JD.L", "KGF.L", "LAND.L", "LGEN.L", "LLOY.L", "LSEG.L", "MNDI.L", "MNG.L",
  "MRO.L", "NG.L", "NWG.L", "NXT.L", "OCDO.L", "PHNX.L", "PRU.L", "PSH.L",
  "PSN.L", "PSON.L", "REL.L", "RIO.L", "RKT.L", "RMV.L", "RR.L", "RTO.L",
  "SBRY.L", "SDR.L", "SGE.L", "SHEL.L", "SMIN.L", "SMT.L", "SN.L", "SPX.L",
  "SSE.L", "STAN.L", "STJ.L", "SVT.L", "TSCO.L", "TW.L", "ULVR.L", "UTG.L",
  "UU.L", "VOD.L", "WEIR.L", "WPP.L", "WTB.L",
];

/** Liquid STOXX 600 extras (Nordics, Benelux, Italy, Switzerland). */
export const STOXX600_EXTRA: readonly string[] = [
  "ASML.AS", "PHIA.AS", "INGA.AS", "AD.AS", "HEIA.AS", "UNA.AS", "WKL.AS",
  "ENEL.MI", "ISP.MI", "UCG.MI", "G.MI", "RACE.MI", "STM.MI", "TIT.MI",
  "NESN.SW", "NOVN.SW", "ROG.SW", "UBSG.SW", "ABBN.SW", "ZURN.SW", "CFR.SW",
  "NOVO-B.CO", "DSV.CO", "ORSTED.CO", "VOLV-B.ST", "ERIC-B.ST", "ATCO-A.ST",
  "NDA-FI.HE", "SAMPO.HE", "KNEBV.HE", "ELI.BR", "KBC.BR", "ABI.BR",
  "GALP.LS", "EDP.LS", "BCP.LS",
];

export function allEuropeTickers(): string[] {
  return [...new Set([...IBEX35, ...DAX40, ...CAC40, ...FTSE100, ...STOXX600_EXTRA])];
}

export function isEuropeTicker(symbol: string): boolean {
  return /\.(MC|DE|PA|L|AS|MI|SW|CO|ST|HE|BR|LS|VI|OL|IR|AT)$/.test(symbol.toUpperCase());
}
