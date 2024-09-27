import { aptosClient } from "@/utils/aptosClient";
import { InputTransactionData, useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@/components/Header";
import sword from "@/assets/sample_collection/1.png";
import fireSword from "@/assets/sample_collection/combination1.png";
import fire from "@/assets/sample_collection/2.png";
import water from "@/assets/sample_collection/3.png";
import { Button } from "@/components/ui/button";

interface NFT {
  id: string;
  name: string;
  image: string;
}

const initialParentNFTs: NFT[] = [
  { id: "1", name: "Parent NFT 1", image: sword },
  { id: "2", name: "Parent NFT 2", image: fireSword },
];

const initialChildrenNFTsData: NFT[] = [
  { id: "1", name: "Child NFT 1", image: fire },
  { id: "2", name: "Child NFT 2", image: fire },
  { id: "3", name: "Child NFT 3", image: water },
];

export function EquipNFT() {
  const { signAndSubmitTransaction } = useWallet();
  const [selectedParent, setSelectedParent] = useState<NFT | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<NFT[]>([]);
  const [initialChildrenNFTs, setInitialChildrenNFTs] = useState<NFT[]>(initialChildrenNFTsData);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id === "droppable-area" && active.id !== over.id) {
      handleChildDrop(active.id.toString());
    } else if (!over) {
      handleUnselectChild(active.id.toString());
    } else if (over && active.id !== over.id) {
      setSelectedChildren((prev) => {
        const oldIndex = prev.findIndex((nft) => nft.id === active.id);
        const newIndex = prev.findIndex((nft) => nft.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleParentSelect = (nft: NFT) => {
    setSelectedParent(nft);
  };

  const handleChildDrop = (id: string) => {
    const droppedNFT = initialChildrenNFTs.find((nft) => nft.id === id);
    if (droppedNFT && !selectedChildren.find((nft) => nft.id === droppedNFT.id)) {
      setSelectedChildren((prev) => [...prev, droppedNFT]);
      setInitialChildrenNFTs((prev) => prev.filter((nft) => nft.id !== id));
    }
  };

  const handleUnselectChild = (id: string) => {
    const removedNFT = selectedChildren.find((nft) => nft.id === id);
    if (removedNFT) {
      setSelectedChildren((prev) => prev.filter((nft) => nft.id !== id));
      setInitialChildrenNFTs((prev) => [...prev, removedNFT]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedParent || selectedChildren.length === 0) return;

    const payload: InputTransactionData = {
      data: {
        function: `${import.meta.env.VITE_MODULE_ADDRESS}::module::function`, // TODO: Add module and function names
        typeArguments: [],
        functionArguments: [selectedParent.id, selectedChildren.map((nft) => nft.id)],
      },
    };

    try {
      const txn = await signAndSubmitTransaction(payload);
      await aptosClient().waitForTransaction(txn.hash);
      console.log("Transaction successful:", txn);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <>
      <Header />

      <div className="container mx-auto px-4 pb-16">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex">
            <div className="w-1/3 p-4">
              <div className="">
                <h2 className="text-xl mb-4">Select Parent NFT</h2>
                <div className="grid grid-cols-2 gap-2">
                  {initialParentNFTs.map((nft) => (
                    <button
                      key={nft.id}
                      className={`w-full aspect-square border ${
                        selectedParent?.id === nft.id ? "border-blue-500" : "border-gray-300"
                      }`}
                      onClick={() => handleParentSelect(nft)}
                    >
                      <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              {selectedParent && (
                <div className="mt-10">
                  <h2 className="text-xl mb-4">Children NFT candidates</h2>
                  <div className="flex space-x-4 min-h-[124px]">
                    {initialChildrenNFTs.map((nft) => (
                      <DraggableChildNFT key={nft.id} nft={nft} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-2/3 flex justify-center items-start p-4">
              {selectedParent && (
                <div className="text-center">
                  <h2 className="text-xl mb-4">Selected Parent NFT</h2>
                  <div className="w-80 h-80 mx-auto border border-blue-500">
                    <img src={selectedParent.image} alt={selectedParent.name} className="w-full h-full object-cover" />
                    <p className="mt-2">{selectedParent.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedParent && (
            <div className="mt-2 text-center">
              <h2 className="text-xl mb-4">Drop Children NFTs here</h2>
              <DroppableArea id="droppable-area">
                <SortableContext items={selectedChildren.map((nft) => nft.id)}>
                  <div className="flex space-x-4 mt-2 justify-center">
                    {selectedChildren.map((nft) => (
                      <SortableNFT key={nft.id} nft={nft} />
                    ))}
                  </div>
                </SortableContext>
              </DroppableArea>
              <DragOverlay>
                {activeId ? (
                  <div className="w-24">
                    <div className="aspect-square border border-green-500">
                      <img
                        src={
                          initialChildrenNFTs.find((nft) => nft.id === activeId)?.image ||
                          selectedChildren.find((nft) => nft.id === activeId)?.image
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-center mt-1">
                      {initialChildrenNFTs.find((nft) => nft.id === activeId)?.name ||
                        selectedChildren.find((nft) => nft.id === activeId)?.name}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          )}
        </DndContext>

        <div className="mt-10 text-center">
          <Button
            variant="green"
            onClick={handleSubmit}
            disabled={!selectedParent || selectedChildren.length === 0 || true}
          >
            Execute
          </Button>
        </div>
      </div>
    </>
  );
}

const DraggableChildNFT: React.FC<{ nft: NFT }> = ({ nft }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: nft.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-24">
      <div className="aspect-square border border-gray-300">
        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-center mt-1">{nft.name}</p>
    </div>
  );
};

const DroppableArea: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="border-2 border-dashed border-gray-500 p-6 min-h-[184px]">
      {children}
    </div>
  );
};

const SortableNFT: React.FC<{ nft: NFT }> = ({ nft }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nft.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-24">
      <div className="aspect-square border border-green-500">
        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-center mt-1">{nft.name}</p>
    </div>
  );
};
