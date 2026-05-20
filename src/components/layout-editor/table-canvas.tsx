"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { Stage, Layer, Rect, Circle, Text, Transformer, Group } from "react-konva";
import type Konva from "konva";

export interface TableData {
  id: string;
  name: string;
  capacity: number;
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
  onTableChange?: (id: string, data: Partial<TableData>) => void;
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
  onTableChange,
  onTableSelect,
  selectedId,
  readOnly = false,
}: Props) {
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(roomWidth);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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

  if (!mounted) return <div ref={containerRef} className="w-full" />;

  const scale = Math.min(1, containerWidth / roomWidth);
  const stageWidth = containerWidth;
  const stageHeight = roomHeight * scale;

  return (
    <div ref={containerRef} className="w-full">
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      scaleX={scale}
      scaleY={scale}
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
              onTransformEnd={(e) => {
                const node = e.target as Konva.Group;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                onTableChange?.(table.id, {
                  x: Math.round(node.x()),
                  y: Math.round(node.y()),
                  rotation: Math.round(node.rotation()),
                  width: Math.max(40, Math.round(table.width * scaleX)),
                  height: Math.max(40, Math.round(table.height * scaleY)),
                });
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
    </div>
  );
}
