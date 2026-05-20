import dynamic from "next/dynamic";

const FloorView = dynamic(() => import("@/components/floor/floor-view"), { ssr: false });

export default function FloorPage() {
  return <FloorView />;
}
