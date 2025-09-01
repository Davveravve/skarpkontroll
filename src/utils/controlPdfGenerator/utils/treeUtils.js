// src/utils/controlPdfGenerator/utils/treeUtils.js - Verktyg för träd-hantering

/**
 * Bygger en hierarkisk träd-struktur från platta noder
 * @param {Array} nodes - Array av platta noder
 * @returns {Array} - Hierarkisk träd-struktur
 */
export const buildNodeTree = (nodes) => {
  if (!Array.isArray(nodes)) return [];
  
  // Skapa en map för snabb lookup
  const nodeMap = {};
  nodes.forEach(node => {
    nodeMap[node.id] = { ...node, children: [] };
  });
  
  // Bygg träd-struktur
  const rootNodes = [];
  
  nodes.forEach(node => {
    const nodeWithChildren = nodeMap[node.id];
    
    if (!node.parentNodeId) {
      // Detta är en root node
      rootNodes.push(nodeWithChildren);
    } else {
      // Detta är en child node
      const parent = nodeMap[node.parentNodeId];
      if (parent) {
        parent.children.push(nodeWithChildren);
      } else {
        // Parent finns inte, behandla som root
        rootNodes.push(nodeWithChildren);
      }
    }
  });
  
  // Sortera alla nivåer efter createdAt
  const sortByCreatedAt = (a, b) => {
    const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
    const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
    return aTime - bTime;
  };
  
  const sortTreeRecursive = (nodes) => {
    nodes.sort(sortByCreatedAt);
    nodes.forEach(node => {
      if (node.children?.length > 0) {
        sortTreeRecursive(node.children);
      }
    });
  };
  
  sortTreeRecursive(rootNodes);
  return rootNodes;
};

/**
 * Beräknar maximalt djup i trädet
 * @param {Array} tree - Träd-struktur
 * @param {number} currentDepth - Nuvarande djup (för rekursion)
 * @returns {number} - Maximalt djup
 */
export const getTreeDepth = (tree, currentDepth = 0) => {
  if (!Array.isArray(tree) || tree.length === 0) return currentDepth;
  
  let maxDepth = currentDepth;
  
  tree.forEach(node => {
    if (node.children?.length > 0) {
      const childDepth = getTreeDepth(node.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });
  
  return Math.max(maxDepth, currentDepth);
};

/**
 * Hämtar alla anmärkningar för en nod (inklusive node-ID)
 * @param {string} nodeId - Node ID
 * @param {Array} remarks - Array av alla anmärkningar
 * @returns {Array} - Anmärkningar för noden
 */
export const getRemarksForNode = (nodeId, remarks) => {
  return remarks.filter(remark => remark.nodeId === nodeId);
};

/**
 * Räknar totalt antal anmärkningar i en nod och dess barn
 * @param {Object} node - Nod-objekt
 * @param {Array} remarks - Array av alla anmärkningar
 * @returns {number} - Total antal anmärkningar
 */
export const countRemarksInSubtree = (node, remarks) => {
  let total = getRemarksForNode(node.id, remarks).length;
  
  if (node.children?.length > 0) {
    node.children.forEach(child => {
      total += countRemarksInSubtree(child, remarks);
    });
  }
  
  return total;
};

/**
 * Hämtar alla noder i trädet som en platt lista med path-information
 * @param {Array} tree - Träd-struktur
 * @param {Array} path - Nuvarande path (för rekursion)
 * @returns {Array} - Platt lista med noder och path
 */
export const flattenTreeWithPaths = (tree, path = []) => {
  const result = [];
  
  tree.forEach(node => {
    const currentPath = [...path, node.name];
    
    result.push({
      ...node,
      path: currentPath,
      pathString: currentPath.join(' > '),
      level: path.length
    });
    
    if (node.children?.length > 0) {
      const childResults = flattenTreeWithPaths(node.children, currentPath);
      result.push(...childResults);
    }
  });
  
  return result;
};

/**
 * Grupperar anmärkningar efter prioritet
 * @param {Array} remarks - Array av anmärkningar
 * @returns {Object} - Grupperade anmärkningar { A: [], B: [], C: [] }
 */
export const groupRemarksByPriority = (remarks) => {
  const groups = { A: [], B: [], C: [] };
  
  remarks.forEach(remark => {
    const priority = remark.priority || 'C';
    if (groups[priority]) {
      groups[priority].push(remark);
    }
  });
  
  return groups;
};

/**
 * Filtrerar trädet för att bara visa noder som har anmärkningar eller barn med anmärkningar
 * @param {Array} tree - Träd-struktur
 * @param {Array} remarks - Array av anmärkningar
 * @returns {Array} - Filtrerat träd med bara relevanta noder
 */
export const filterTreeForRemarks = (tree, remarks) => {
  const hasRemarksRecursive = (node) => {
    // Kolla om noden själv har anmärkningar
    const nodeRemarks = getRemarksForNode(node.id, remarks);
    if (nodeRemarks.length > 0) {
      return true;
    }
    
    // Kolla om någon av barn-noderna har anmärkningar
    if (node.children && node.children.length > 0) {
      return node.children.some(child => hasRemarksRecursive(child));
    }
    
    return false;
  };
  
  const filterNode = (node) => {
    // Filtrera barn först
    let filteredChildren = [];
    if (node.children && node.children.length > 0) {
      filteredChildren = node.children
        .filter(hasRemarksRecursive)
        .map(filterNode);
    }
    
    return {
      ...node,
      children: filteredChildren
    };
  };
  
  // Filtrera root-noder
  return tree
    .filter(hasRemarksRecursive)
    .map(filterNode);
};