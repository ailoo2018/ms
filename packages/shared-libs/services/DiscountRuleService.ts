import {Money, PriceComponentType} from "../models";


let rules: any = null;

export class DiscountRuleService {
	private productCategoryService: any;
	private categoryMap: any;
	private db: any;


	constructor({db, productCategoryService}:{db:any, productCategoryService:any}) {
		this.productCategoryService = productCategoryService;
		this.db = db;
	}

	async findDiscount(id:any, domainId:any){
		const connection = await this.db.getConnection();
		const now = new Date();
		try {
			const [rows] = await connection.execute(`select * from Discount where Id = ? and DomainId = ? order by Id desc`, [id, domainId]);

			if (rows == null || rows.length == 0)
				return null;

			var row = rows[0]

			var config = row.Config && row.Config.length > 0 ? JSON.parse(row.Config) : null
			if(config == null )
				return null

			config.id = row.Id
			config.name = row.Name
			config.validFrom = row.ValidFrom
			config.vallidThru = row.ValidThru
			return config;
		} finally {
			await connection.release();
		}
	}

	async getActiveDiscounts(domainId:any) {
		const connection = await this.db.getConnection();
		const now = new Date();
		try {
			const [rows, fields] = await connection.execute(
			  `   
select * from Discount where ValidFrom <= ? and ValidThru >= ? and DomainId = ? order by Id desc
`, [now, now, domainId]
			);

			if (rows == null || rows.length == 0)
				return [];


			return rows;
		} finally {
			await connection.release();
		}
	}

	async loadRules(domainId:any) {
		if (rules == null) {
			var discountRows = await this.getActiveDiscounts(domainId);
			rules = [];

			for (var dr of discountRows) {
				var config = null;
				var rule: any = {
					id: dr.Id,
					name: dr.Name,
					validFrom: dr.ValidFrom,
					validThru: dr.ValidThru,
					domainId: dr.DomainId,
				}
				if (dr.Config && dr.Config.length > 0) {
					rule.config = JSON.parse(dr.Config);
				}

				rule.isUnitRule = true;
				if (rule.config && rule.config.rules) {
					var qty = 0;
					for (var r of rule.config.rules) {
						qty += r.quantity;
					}

					rule.isUnitRule = qty === 1;
				}

				rules.push(rule);
			}
		}
	}

	/**
	 * unit rules are units that only apply to one item (quantity = 1)
	 */
	async getUnitRules(domainId:any) {
		if (rules == null) {
			await this.loadRules(domainId);
		}
		return rules.filter((r:any) => r.isUnitRule);
	}

	async nonProductSpecificDiscount(pack:any, brandId:any, categoryIds:any, saleTypeId:any, tagsIds:any, domainId:any, quantity = 0, productId = 0) {
		const applicableDiscounts = await this.getApplicableDiscounts(pack, brandId, categoryIds, saleTypeId, tagsIds, domainId, productId);

		if (applicableDiscounts.length === 0)
			return null;
		var cboRule = applicableDiscounts[0];
		var discountAmount = 0

		if (cboRule.config.discount.type != "%") {
			// TODO WHY DO I NOT ALLOW DICOUNT WITH AMOUNT? DO TESTCASES TO MAKE SURE .
			//    throw new Exception("No se puede generar descuento global con monto.");

			var pc1 =
			  {
				  price: new Money(cboRule.discount.amount, "CLP"),
				  type: (PriceComponentType.DISCOUNT),
				  fromQuantity: 0,
				  thruQuantity: 0,
				  ruleId: cboRule != null ? cboRule.id : 0
			  }


			return pc1;
		}


		// todo only works with %
		var pc =
		  {
			  percent: cboRule.config.discount.amount,
			  type: PriceComponentType.DISCOUNT,
			  fromQuantity: 0,
			  thruQuantity: 0,
			  ruleId: cboRule != null ? cboRule.id : 0
		  }
		;

		return pc;

	}

	async getApplicableDiscounts(pack:any, brand:any, categoryId:any, saleTypeId:any, tagsIds:any, domainId:any, productId = 0) {
		var unitRules = await this.getUnitRules(domainId);

		return unitRules.filter((discount:any) => this.Applies(pack, discount, brand, saleTypeId, categoryId, tagsIds, domainId, productId));
	}

	Applies(pack:any, rule:any, brand:any, saleTypeId:any, categoryIds:any, tagsIds:any, domainId:any, productId = 0) {

		if(rule.id === 2133)
			console.log("here")

		if (!this.appliesSaleType(rule, saleTypeId))
			return false;

		if (!this.appliesBrand(rule, brand))
			return false;
		if ((this.HasProductTags(rule)) && (tagsIds == null || tagsIds.length == 0))
			return false;
		if (this.HasProductTags(rule) && !tagsIds.some((tagId:any) => this.appliesProductTag(rule, tagId)))
			return false;

		if (!categoryIds.some((categoryId:any) => this.appliesCategory(rule, categoryId, domainId)))
			return false;

		if (productId > 0 && this.HasProductRules(rule) && !this.appliesProduct(rule, productId)) // Rules products
			return false;

		return true;
	}

	appliesProduct(rule:any, productId:any) {
		for (var item of rule.config.rules) {
			if (!rule.products || rule.products.length === 0 || rule.products.some((st:any) => st.id === productId))
				return true;
		}
		return false;
	}

	appliesBrand(rule:any, brandId:any) {
		for (var item of rule.config.rules) {
			if (!item.brands || item.brands.length === 0 || item.brands.some((st:any) => st.id === brandId))
				return true;
		}
		return false;
	}

	HasProductRules(rule:any) {
		for (var item of rule.config.rules) {
			if (item.products && item.products.length > 0)
				return true;
		}

		return false;
	}

	appliesSaleType(rule:any, saleTypeId:any) {

		if (!rule.config.saleTypes || rule.config.saleTypes.length === 0 || rule.config.saleTypes.some((st:any) => st.id === saleTypeId))
			return true;

		return false;
	}

	appliesProductTag(rule:any, tagId:any) {
		for (var item of rule.config.rules) {
			if (item.tags == null || item.tags.length === 0 || item.tags.some((t:any) => t.id === tagId))
				return true;
		}
		return false;
	}

	appliesCategory(rule:any, categoryId:any, domainId: number) {
		for (const r of rule.config.rules) {
			if (r.categories) {
				for (const ruleCategory of r.categories) {
					if (this.categoryMap.isOrHasAncestor(categoryId, ruleCategory.Id))
						return true;
				}
			}
		}

		return true;
	}

	HasProductTags(rule:any) {
		for (var item of rule.config.rules) {
			if (item.tags != null && item.tags.length > 0)
				return true;
		}
		return false;
	}


}

