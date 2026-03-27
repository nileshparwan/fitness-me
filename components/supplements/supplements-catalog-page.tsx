"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AssignSupplementsSheet } from "@/components/supplements/assign-supplements-sheet";
import { CreateCustomSupplementSheet } from "@/components/supplements/create-custom-supplement-sheet";
import { EditSupplementSheet } from "@/components/supplements/edit-supplement-sheet";
import { SupplementCatalogTable } from "@/components/supplements/supplement-catalog-table";
import { Button } from "@/components/ui/button";
import { useSupplementCatalog } from "@/hooks/use-supplements";
import type { Database } from "@/types/database";

type SupplementCatalogRow = Database["public"]["Tables"]["supplement_catalog"]["Row"];

export function SupplementsCatalogPage() {
  const catalogQuery = useSupplementCatalog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<SupplementCatalogRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSupplementIds, setAssignSupplementIds] = useState<string[]>([]);

  return (
    <div className="section-gap">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Supplement Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Browse supplements and build custom entries for your workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" className="accent-strong rounded-xl text-black" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplement
          </Button>
        </div>
      </section>

      <SupplementCatalogTable
        rows={catalogQuery.data || []}
        isLoading={catalogQuery.isLoading}
        onEditSupplement={(supplement) => setEditingSupplement(supplement)}
        onBulkAssign={(supplements) => {
          setAssignSupplementIds(supplements.map((supplement) => supplement.id));
          setAssignOpen(true);
        }}
      />

      <CreateCustomSupplementSheet open={createOpen} onOpenChange={setCreateOpen} />
      <AssignSupplementsSheet
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignSupplementIds([]);
        }}
        initialSupplementIds={assignSupplementIds}
      />
      <EditSupplementSheet
        open={Boolean(editingSupplement)}
        onOpenChange={(open) => {
          if (!open) setEditingSupplement(null);
        }}
        supplement={editingSupplement}
      />
    </div>
  );
}
