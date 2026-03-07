import logger from '../utils/logger.js';
import {Mutex} from "async-mutex";
import {getAllLeafsFromParents} from "../utils/tree-utils";

const mutex = new Mutex();

let _treeMap = {};




function findNodeById(root:any, targetId:any) : any{
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

// Helper function to traverse the tree and build the parent map
function traverse(node:any, ancestors:any, parentMap: any) {
	// For each ancestor, create a relationship entry
	for (const ancestorId of ancestors) {
		parentMap[`${node.id}_${ancestorId}`] = true;
	}

	// If node has children, traverse each child
	if (node.children && node.children.length > 0) {
		// For each child, add current node and all ancestors to the ancestors array
		const newAncestors = [node.id, ...ancestors];
		for (const child of node.children) {
			traverse(child, newAncestors, parentMap);
		}
	}
}

export class ProductCategoryService {
	private redisClient: any;
	private productCategoryDb: any;
	private _treeMap: any
	private parentMap: any

	constructor({ redisClient, productCategoryDb }: { redisClient: any, productCategoryDb : any}) {
		this.redisClient = redisClient
		this.productCategoryDb = productCategoryDb
	}

	async isOrHasParent(childId :any, parentId:any, domainId:any) {
		var map = await  this.getTreeMap(domainId)
		return map.isOrHasAncestor(childId, parentId);
	}

	async getTreeMap(domainId:any) {
		if(this._treeMap["" + domainId] == null) {
			this._treeMap["" + domainId] = await this.createParentMap(domainId);
		}
		return {
			isOrHasAncestor : (childId :any, parentId:any) => {
				if(childId === parentId )
					return true;

				return this._treeMap["" + domainId][ `${childId}_${parentId}` ];
			}
		};
	}

	async findCategory(id:any, domainId:any){
		const tree =  await this.getCategoryTree(domainId)
		return findNodeById(tree, id);
	}

	async createParentMap(domainId:any) {
		const tree = await this.getCategoryTree(domainId);
		const parentMap = {};



		// Start traversal from the root node with empty ancestors
		traverse(tree, [], this.parentMap);

		return parentMap;
	}

	async getCategoryTree(domainId:any, forceReload = false) {

		if (forceReload) {
			logger.info("************* Reloading cache with force")
			await this.doLoadCache(domainId);
		}
		var val = await this.redisClient.get("product_category:tree:" + domainId);

		return JSON.parse(val);
	}

	async doLoadCache(domainId:any) {

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

	async leafs(parentsIds:any, domainId:any){
		const tree = await this.getCategoryTree(domainId)
		return getAllLeafsFromParents(tree, parentsIds)
	}


}
