"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { WarehouseTreeGhostCard } from "@/components/inventory/WarehouseTreeCard";
import type { WarehouseTreeGroup } from "@/lib/inventory/warehouse-tree";

export type WarehouseKanbanMember =
  | { kind: "manufacturer"; id: string; label: string; dragEnabled: boolean }
  | { kind: "article"; id: string; label: string; dragEnabled: boolean };

function columnDropId(groupId: string): string {
  return `wh-col:${groupId}`;
}

function memberDragId(groupId: string, member: WarehouseKanbanMember): string {
  return `wh-mem:${groupId}:${member.kind}:${member.id}`;
}

function DroppableColumn({
  group,
  children,
}: {
  group: WarehouseTreeGroup;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(group.id),
    data: { groupId: group.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[210px] max-w-[240px] shrink-0 flex-col items-center gap-3 rounded-xl border border-transparent p-2 ${
        isOver ? "border-sky-400/80 bg-sky-400/10" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DraggableMember({
  id,
  data,
  enabled,
  children,
}: {
  id: string;
  data: Record<string, unknown>;
  enabled: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, data, disabled: !enabled });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        cursor: enabled ? "grab" : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function WarehouseGroupKanban({
  groups,
  membersOf,
  renderHeader,
  onMove,
  onAddGroup,
}: {
  groups: WarehouseTreeGroup[];
  membersOf: (group: WarehouseTreeGroup) => Array<{
    member: WarehouseKanbanMember;
    node: ReactNode;
  }>;
  renderHeader: (group: WarehouseTreeGroup) => ReactNode;
  onMove: (args: {
    source: WarehouseTreeGroup;
    dest: WarehouseTreeGroup;
    member: WarehouseKanbanMember;
  }) => void;
  onAddGroup: () => void;
}): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const byId = new Map(groups.map((g) => [g.id, g]));

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== "string" || !overId.startsWith("wh-col:")) return;
    const destId = overId.slice("wh-col:".length);
    const dest = byId.get(destId);
    const data = event.active.data.current as
      | {
          sourceGroupId?: string;
          member?: WarehouseKanbanMember;
        }
      | undefined;
    const source = data?.sourceGroupId ? byId.get(data.sourceGroupId) : null;
    const member = data?.member;
    if (!dest || !source || !member || source.id === dest.id) return;
    onMove({ source, dest, member });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex w-full items-start justify-center gap-3 overflow-x-auto pb-2">
        {groups.map((group) => (
          <DroppableColumn key={group.id} group={group}>
            {renderHeader(group)}
            {membersOf(group).map(({ member, node }) => (
              <DraggableMember
                key={memberDragId(group.id, member)}
                id={memberDragId(group.id, member)}
                enabled={member.dragEnabled}
                data={{ sourceGroupId: group.id, member }}
              >
                {node}
              </DraggableMember>
            ))}
          </DroppableColumn>
        ))}
        <WarehouseTreeGhostCard
          level="group"
          label="Добавить группу"
          onClick={onAddGroup}
        />
      </div>
    </DndContext>
  );
}
