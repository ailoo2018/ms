
const baseUrl = process.env.PRODUCTS_MS_URL
let _tree = null

const getTree = async domainId => {

  if(_tree)
    return _tree;


  var rs = await fetch(baseUrl + "/category/tree/" + domainId)
  _tree = await rs.json()

  flatten(_tree, null)

  return _tree

}

const nodeMap = new Map();
// Pre-process the tree once
function flatten(node, parentId = null) {
  nodeMap.set(node.id, parentId); // Store the ID of the parent
  node.children.forEach(child => flatten(child, node.id));
}



function findNodeById(root, targetId) {
  if (root.id === targetId) {
    return root;
  }

  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const found = findNodeById(child, targetId);
      if (found) return found; // Return immediately if found in a branch
    }
  }

  return null;
}


const findCategory = async (categoryId, domainId) => {
  const root = await getTree(domainId)
  return findNodeById(root, categoryId)
}

function isOrHasParent(childId, targetParentId) {
  let currentId = childId;
  while (currentId !== null) {
    if (currentId === targetParentId) return true;
    currentId = nodeMap.get(currentId); // Look up parent ID
  }
  return false;
}




module.exports = { getTree, findCategory, isOrHasParent }


