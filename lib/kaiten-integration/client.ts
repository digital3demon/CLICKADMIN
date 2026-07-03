/**
 * Tenant-aware обёртки над kaiten-rest. Policy — в guard/settings; здесь только делегирование.
 */
export {
  getKaitenRestAuth,
  kaitenCreateCard,
  kaitenCreateComment,
  kaitenGetCard,
  kaitenListBoardColumns,
  kaitenListComments,
  kaitenPatchCard,
} from "@/lib/kaiten-rest";

export { getKaitenEnvConfig, isKaitenTokenPresent } from "@/lib/kaiten-config";
