const logger = require("../utils/logger");
const {Mutex} = require('async-mutex');
const treeUtils = require('../utils/tree-utils');

const mutex = new Mutex();

let _treeMap = {};




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

class ProductCategoryService {

	constructor({ redisClient, productCategoryDb }) {
		this.redisClient = redisClient
		this.productCategoryDb = productCategoryDb
	}

	async isOrHasParent(childId, parentId, domainId) {
		var map = await  this.getTreeMap(domainId)
		return map.isOrHasAncestor(childId, parentId);
	}

	async getTreeMap(domainId) {
		if(_treeMap["" + domainId] == null) {
			_treeMap["" + domainId] = await this.createParentMap(domainId);
		}
		return {
			isOrHasAncestor : (childId, parentId) => {
				if(childId === parentId )
					return true;

				return _treeMap["" + domainId][ `${childId}_${parentId}` ];
			}
		};
	}

	async findCategory(id, domainId){
		const tree =  await this.getCategoryTree(domainId)
		return findNodeById(tree, id);
	}

	async createParentMap(domainId) {
		const tree = await this.getCategoryTree(domainId);
		const parentMap = {};

		// Helper function to traverse the tree and build the parent map
		function traverse(node, ancestors = []) {
			// For each ancestor, create a relationship entry
			for (const ancestorId of ancestors) {
				parentMap[`${node.id}_${ancestorId}`] = true;
			}

			// If node has children, traverse each child
			if (node.children && node.children.length > 0) {
				// For each child, add current node and all ancestors to the ancestors array
				const newAncestors = [node.id, ...ancestors];
				for (const child of node.children) {
					traverse(child, newAncestors);
				}
			}
		}

		// Start traversal from the root node with empty ancestors
		traverse(tree);

		return parentMap;
	}

	async getCategoryTree(domainId, forceReload = false) {

		if (forceReload) {
			logger.info("************* Reloading cache with force")
			await this.doLoadCache(domainId);
		}
		var val = await this.redisClient.get("product_category:tree:" + domainId);

		return JSON.parse(val);
	}

	async doLoadCache(domainId) {

		const release = await mutex.acquire();
		try {

			var createTreeRet = await this.productCategoryDb.createTree(domainId);

			const multi = this.redisClient.multi();
			for (let i = 0; i < createTreeRet.asRows.length; i++) {
				const row = createTreeRet.asRows[i];


				multi.zAdd('product_category:' + domainId + ':names', {score: row.id, value: row.name});
				multi.zAdd('product_category:' + domainId + ':categories', {
					score: row.id,
					value: JSON.stringify(row)
				});

				if (row.isLeaf) {
					multi.zAdd('product_category:' + domainId + ':leafs', {
						score: row.id,
						value: JSON.stringify(row)
					});
				}


			}
			multi.set("product_category:tree:" + domainId, JSON.stringify(createTreeRet.root));
			multi.exec();

			var total = createTreeRet.asRows.length;

			return {
				totalCategories: total,
				root: createTreeRet.root
			};
		} finally {
			await release();
		}
	}

	async leafs(parentsIds, domainId){
		const tree = await this.getCategoryTree(domainId)
		return treeUtils.getAllLeafsFromParents(tree, parentsIds)
	}


}


module.exports.ProductCategoryService = ProductCategoryService;