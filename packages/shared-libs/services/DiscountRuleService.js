const {PriceComponentType} = require("../models");


let rules = null;

class DiscountRuleService {


	constructor({db, productCategoryService}) {
		this.productCategoryService = productCategoryService;
		this.db = db;
	}

	async findDiscount(id, domainId){
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

	async getActiveDiscounts(domainId) {
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

	async loadRules(domainId) {
		if (rules == null) {
			var discountRows = await this.getActiveDiscounts(domainId);
			rules = [];

			for (var dr of discountRows) {
				var config = null;
				var rule = {
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
	async getUnitRules(domainId) {
		if (rules == null) {
			await this.loadRules(domainId);
		}
		return rules.filter(r => r.isUnitRule);
	}

	async nonProductSpecificDiscount(pack, brandId, categoryIds, saleTypeId, tagsIds, domainId, quantity = 0, productId = 0) {
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
				  type: (PriceComponent.PriceComponentType.DISCOUNT),
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

	async getApplicableDiscounts(pack, brand, categoryId, saleTypeId, tagsIds, domainId, productId = 0) {
		var unitRules = await this.getUnitRules(domainId);

		return unitRules.filter(discount => this.Applies(pack, discount, brand, saleTypeId, categoryId, tagsIds, domainId, productId));
	}

	Applies(pack, rule, brand, saleTypeId, categoryIds, tagsIds, domainId, productId = 0) {
		if (!this.appliesSaleType(rule, saleTypeId))
			return false;

		if (!this.appliesBrand(rule, brand))
			return false;
		if ((this.HasProductTags(rule)) && (tagsIds == null || tagsIds.length == 0))
			return false;
		if (this.HasProductTags(rule) && !tagsIds.some(tagId => this.appliesProductTag(rule, tagId)))
			return false;

		if (!categoryIds.some(categoryId => this.appliesCategory(rule, categoryId, domainId)))
			return false;

		if (productId > 0 && this.HasProductRules(rule) && !this.appliesProduct(rule, productId)) // Rules products
			return false;

		return true;
	}

	appliesProduct(rule, productId) {
		for (var item of rule.config.rules) {
			if (!rule.products || rule.products.length === 0 || rule.products.some(st => st.id === productId))
				return true;
		}
		return false;
	}

	appliesBrand(rule, brandId) {
		for (var item of rule.config.rules) {
			if (!item.brands || item.brands.length === 0 || item.brands.some(st => st.id === brandId))
				return true;
		}
		return false;
	}

	HasProductRules(rule) {
		for (var item of rule.config.rules) {
			if (item.products && item.products.length > 0)
				return true;
		}

		return false;
	}

	appliesSaleType(rule, saleTypeId) {

		if (!rule.config.saleTypes || rule.config.saleTypes.length === 0 || rule.config.saleTypes.some(st => st.id === saleTypeId))
			return true;

		return false;
	}

	appliesProductTag(rule, tagId) {
		for (var item of rule.config.rules) {
			if (item.tags == null || item.tags.length === 0 || item.tags.some(t => t.id === tagId))
				return true;
		}
		return false;
	}

	appliesCategory(rule, categoryId) {
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

	HasProductTags(rule) {
		for (var item of rule.config.rules) {
			if (item.tags != null && item.tags.length > 0)
				return true;
		}
		return false;
	}


}

module.exports.DiscountRuleService = DiscountRuleService;