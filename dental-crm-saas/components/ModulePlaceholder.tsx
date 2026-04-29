import { ModuleFrame } from "@/components/layout/ModuleFrame";

type ModulePlaceholderProps = {
  title: string;
  description?: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return <ModuleFrame title={title} description={description} />;
}
