import { CrmModuleListSnapshot } from "@/components/layout/CrmModuleListSnapshot";

function Loading() {
  return <CrmModuleListSnapshot title="Заказы" />;
}
Loading.isCrmListLoading = true;

export default Loading;
