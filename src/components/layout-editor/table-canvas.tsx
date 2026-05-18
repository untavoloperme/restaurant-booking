"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const Rect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const Circle = dynamic(() => import("react-konva").then((m) => m.Circle), { ssr: false });
const Ellipse = dynamic(() => import("react-konva").then((m) => m.Ellipse), { ssr: false });
const Text = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const Transformer = dynamic(() => import("react-konva").then((m) => m.Transformer), { ssr: false });
const Group = dynamic(() => import("react-konva").then((m) => m.Group), { ssr: false });

export interface TableData {
  id: string;
  name: string;
  capacity: 4 | 6 | 8 | 10;
  shape: "round" | "square" | "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Props {
  tables: TableData[];
  roomWidth: number;
  roomHeight: number;
  onTableMove: (id: string, x: number, y: number) => void;
  onTableSelect: (id: string | null) => void;
  selectedId: string | null;
  readOnly?: boolean;
}

const CAPACITY_COLORS: Record<number, string> = {
  4: "#93c5fd",
  6: "#6ee7b7",
  8: "#fcd34d",
  10: "#f9a8d4",
};

export default function TableCanvas({
  tables,
  roomWidth,
  roomHeight,
  onTableMove,
  onTableSelect,
  selectedId,
  readOnly = false,
}: Props) {
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [mounted, setMounted] = useState(false);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!transformerRef.current || !selectedId) {
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current.get(selectedId);
    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  const setRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  if (!mounted) return null;

  return (
    <Stage
      ref={stageRef}
      width={roomWidth}
      height={roomHeight}
      className="border border-dashed border-slate-300 rounded bg-slate-50"
      onClick={(e) => {
        if (e.target === e.target.getStage()) onTableSelect(null);
      }}
    >
      <Layer>
        {tables.map((table) => {
          const fill = CAPACITY_COLORS[table.capacity] ?? "#d1d5db";
          const isSelected = selectedId === table.id;

          return (
            <Group
              key={table.id}
              ref={(node) => setRef(table.id, node as Konva.Group | null)}
              x={table.x}
              y={table.y}
              rotation={table.rotation}
              draggable={!readOnly}
              onClick={() => onTableSelect(table.id)}
              onTap={() => onTableSelect(table.id)}
              onDragEnd={(e) => {
                onTableMove(table.id, e.target.x(), e.target.y());
              }}
            >
              {table.shape === "round" ? (
                <Circle
                  x={0}
                  y={0}
                  radius={table.width / 2}
                  fill={fill}
                  stroke={isSelected ? "#1d4ed8" : "#94a3b8"}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
              ) : (
                <Rect
                  x={-table.width / 2}
                  y={-table.height / 2}
                  width={table.width}
                  height={table.height}
                  fill={fill}
                  stroke={isSelected ? "#1d4ed8" : "#94a3b8"}
                  strokeWidth={isSelected ? 3 : 1.5}
                  cornerRadius={table.shape === "square" ? 6 : 4}
                />
              )}
              <Text
                text={`${table.name}\n${table.capacity}p`}
                fontSize={11}
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
                x={-table.width / 2}
                y={-12}
                width={table.width}
                height={24}
                fill="#1e293b"
              />
            </Group>
          );
        })}
        {!readOnly && (
          <Transformer
            ref={transformerRef as React.RefObject<Konva.Transformer>}
            rotateEnabled
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 40 || newBox.height < 40) return oldBox;
              return newBox;
            }}
          />
        )}
      </Layer>
    </Stage>
  );
}
