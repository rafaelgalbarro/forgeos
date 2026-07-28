/** Venture store — delegates to persistence venture bridge (Sprint 3). */

export {
  getVentures,
  saveVenture,
  getVentureById,
  deleteVenture,
  asyncGetVentures,
  asyncSaveVenture,
  asyncGetVentureById,
  asyncGetVenturesByWorkspace,
} from "@/lib/persistence/bridges/venture-bridge";
