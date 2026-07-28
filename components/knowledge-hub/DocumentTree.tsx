"use client";

import { useState } from "react";
import type { DocumentTree, KnowledgeNode } from "@/lib/knowledge-hub";
import { getChildNodes } from "@/lib/knowledge-hub";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";
import { nodeMatchesQuery } from "@/lib/knowledge-hub";

interface DocumentTreeProps {
  tree: DocumentTree;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  searchQuery: string;
  visibleNodeIds?: Set<string>;
}

function statusVariant(status: KnowledgeNode["status"]): "accent" | "amber" | "default" {
  if (status === "complete") return "accent";
  if (status === "partial") return "amber";
  return "default";
}

function TreeNode({
  node,
  tree,
  selectedNodeId,
  onSelect,
  searchQuery,
  visibleNodeIds,
  depth = 0,
}: {
  node: KnowledgeNode;
  tree: DocumentTree;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  searchQuery: string;
  visibleNodeIds?: Set<string>;
  depth?: number;
}) {
  const children = getChildNodes(tree, node.id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  if (visibleNodeIds && !visibleNodeIds.has(node.id)) {
    const childVisible = children.some((c) => visibleNodeIds.has(c.id));
    if (!childVisible) return null;
  }

  if (searchQuery && !nodeMatchesQuery(node, searchQuery)) {
    const childMatches = children.some((c) => nodeMatchesQuery(c, searchQuery));
    if (!childMatches && (!visibleNodeIds || !visibleNodeIds.has(node.id))) return null;
  }

  return (
    <div className="fhis-kh-tree-node" style={{ paddingLeft: depth * 12 }}>
      <div className="fhis-kh-tree-row">
        {hasChildren ? (
          <button
            type="button"
            className="fhis-kh-tree-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="fhis-kh-tree-toggle-spacer" />
        )}
        <button
          type="button"
          className={cn(
            "fhis-kh-tree-item",
            selectedNodeId === node.id && "fhis-kh-tree-item-active"
          )}
          onClick={() => onSelect(node.id)}
        >
          <span className="fhis-kh-tree-title">{node.title}</span>
          <Badge variant={statusVariant(node.status)} className="fhis-kh-tree-badge">
            {node.status}
          </Badge>
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            tree={tree}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            searchQuery={searchQuery}
            visibleNodeIds={visibleNodeIds}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function DocumentTree({
  tree,
  selectedNodeId,
  onSelect,
  searchQuery,
  visibleNodeIds,
}: DocumentTreeProps) {
  return (
    <nav className="fhis-kh-tree" aria-label="Árbol de documentos">
      {tree.categories.map((category) => {
        const roots = tree.nodes.filter(
          (n) => n.category === category.id && !n.parentId
        );
        const visibleRoots = roots.filter((n) => {
          if (!searchQuery && !visibleNodeIds) return true;
          if (visibleNodeIds?.has(n.id)) return true;
          if (searchQuery && nodeMatchesQuery(n, searchQuery)) return true;
          return getChildNodes(tree, n.id).some(
            (c) =>
              visibleNodeIds?.has(c.id) ||
              (searchQuery && nodeMatchesQuery(c, searchQuery))
          );
        });
        if (visibleRoots.length === 0) return null;

        return (
          <div key={category.id} className="fhis-kh-tree-category">
            <span className="fhis-kh-tree-category-label">{category.label}</span>
            {visibleRoots.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                tree={tree}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                searchQuery={searchQuery}
                visibleNodeIds={visibleNodeIds}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}
