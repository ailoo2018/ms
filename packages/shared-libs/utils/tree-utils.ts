
function getLeafs(node: any) : any {
  let leafs : any[] = [];

  if (node.isLeaf || !node.children || node.children.length === 0) {
    leafs.push(node);
  } else {
    for (const child of node.children) {
      leafs = leafs.concat(getLeafs(child));
    }
  }

  return leafs;
}

/**
 * Finds target parents by ID and returns all their underlying leafs.
 * @param {Object} tree - The full tree object.
 * @param {Array<number>} parentIds - List of IDs to get leafs for.
 */
export function getAllLeafsFromParents(tree :any, parentIds :any) {
  let results : any[] = [];

  // Helper to find the parent nodes first
  function findNodesAndCollectLeafs(currentNode: any) {
    if (parentIds.includes(currentNode.id)) {
      // Once we find a target parent, we get all its leafs
      results = results.concat(getLeafs(currentNode));
      // We return here assuming IDs are unique and we don't need to check children
      return;
    }

    if (currentNode.children && currentNode.children.length > 0) {
      for (const child of currentNode.children) {
        findNodesAndCollectLeafs(child);
      }
    }
  }

  findNodesAndCollectLeafs(tree);

  // Use a Map or Set to remove duplicates if parentIds contains nested IDs
  return results;
}

