const {AppliesToEnum} = require("../models");
const {v4: uuidv4} = require('uuid');
const prodDirectCategory = require("../../../w3.ailoo.cl/services/categoryTreeService");
const {SaleType} = require("../../../w3.ailoo.cl/models/domain");

/**
 * Returns the item with the lowest price from a list of applicable items.
 * @param {Array} applicableItems - List of objects containing an 'item' property.
 * @returns {Object|null} The cheapest item or null if the list is empty.
 */
function getPriceOfCheapestItem(applicableItems) {
  if (!applicableItems || applicableItems.length === 0) {
    return null;
  }

  return applicableItems.reduce((cheapest, current) => {
    // If current item's price is lower than our current cheapest, return current
    return (current.item.price < cheapest.price) ? current.item : cheapest;
  }, applicableItems[0].item); // Initialize with the first item in the list
}

function GetTotalOfApplicableItems(applicableItems) {
  let total = 0;
  for (var ai of applicableItems)
    total += (ai.item.price ?? 0) * ai.quantity;
  return total;
}


class CartService {


  constructor({productCategoryService, discountRuleService}) {
    this.productCategoryService = productCategoryService
    this.discountRuleService = discountRuleService
  }

  async applies(productRuleDto, item, domainId, discountRule) {

    try {
      let qty = 0;

      // 1. Initial Validations
      if (!item.quantity || !productRuleDto.quantity || !item.productId) {
        return {applies: false, qty: 0};
      }

      // 2. Map Lookup (Assuming productMap is a Map or Object in scope) aabb
      const product = item.product
      if (!product) {
        return {applies: false, qty: 0};
      }

      // 3. Categories Check (Handling the subcategory logic)
      if (productRuleDto.categories?.length > 0) {
        let idCategoryAux = 0;

        for (const ruleCategory of productRuleDto.categories) {

          let hasMatch = false;
          for (var dc of product.directCategories) {
            const hasParent = await this.productCategoryService.isOrHasParent(dc, ruleCategory.id, domainId);
            if (hasParent) {
              hasMatch = true;
              break;
            }
          }


          if (hasMatch) {
            idCategoryAux = ruleCategory.id;
            break;
          }
        }

        if (idCategoryAux === 0) return {applies: false, qty: 0};
      }

      // 4. Brands Check
      if (productRuleDto.brands?.length > 0) {
        if (!productRuleDto.brands.some(b => b.id === product.BrandId)) {
          return {applies: false, qty: 0};
        }
      }

      // 5. Tags Check (Nested Any)
      if (productRuleDto.tags?.length > 0) {
        const hasTag = productRuleDto.tags.some(tag =>
            product.TagsIds.some(prodTagId => prodTagId === tag.id)
        );
        if (!hasTag) return {applies: false, qty: 0};
      }

      // 6. Products Check
      if (productRuleDto.products?.length > 0) {
        if (!productRuleDto.products.some(prd => prd.id === product.id)) {
          return {applies: false, qty: 0};
        }
      }

      // 7. Price Check
      if (item.price < (productRuleDto.minPrice ?? 0)) {
        return {applies: false, qty: 0};
      }

      // 8. Quantity Calculation
      if (discountRule.appliesTo === "TotalApplicableItemsOneSale") { // Assuming String or Enum value
        qty = Math.floor(item.quantity);
      } else {
        qty = Math.min(productRuleDto.quantity, Math.floor(item.quantity));
      }

      return {applies: true, qty: qty};
    } catch (e) {
      console.error(e);
      return {applies: false, qty: 0};
    }
  }

  async getDiscounts(rq, discountRule, domainId) {
    const discounts = [];
    let invoiceItem;
    // aplica a toda la venta y no a productos especificos
    if (discountRule.rules.length === 0) {
      let discountAmount = 0;

      let total = rq.items.reduce((sum, item) => sum + (item.quantity * (item.price ?? 0)), 0);
      if (discountRule.discount.type === "%") {
        discountAmount =
            Math.round(total * (discountRule.discount.amount / 100) * -1);
      }

      const guid = uuidv4();
      invoiceItem =
          {
            uid: guid,
            type: "DISCOUNT",
            name: discountRule.name,
            comment: discountRule.name,
            price: discountAmount,
            isCreatedByRule: true,
            quantity: 1,
            position: rq.items.length + 1,
            appliedDiscount: {
              id: discountRule.id,
              name: discountRule.name,
              discount: discountRule.discount
            }
          }

      discounts.push(invoiceItem);

      return discounts;
    }


    let applicableItems = [];
    const MAX = 5000;
    let safetyNet = 0;
    let position = 2;
    for (var i = 0; i < rq.items.length; i++) {
      safetyNet++;
      if (safetyNet > MAX)
        break;

      var item = rq.items[i];
      var totalQuantityOfDiscountRule = discountRule.rules.reduce((sum, r) => sum + r.quantity, 0);
      for (var productRule of discountRule.rules) {

        if(!productRule.currentCount)
          productRule.currentCount = 0

        if (productRule.currentCount === productRule.quantity)
          continue;

        const {applies, qty} = await this.applies(productRule, item, domainId, discountRule, rq.items)
        if (applies) {

          applicableItems.push({item: item, quantity: qty});

          let leftOver = 0;
          if (productRule.currentCount + qty > productRule.quantity) {
            leftOver = productRule.currentCount + qty - productRule.quantity;
            productRule.currentCount = productRule.quantity;
          } else {
            productRule.currentCount += qty;
          }

          if (discountRule.rules.reduce((sum, r) => sum + r.currentCount, 0) === totalQuantityOfDiscountRule) {
            // TODO add discount
            var discountAmount = 0;
            var appliesTo = [];
            let cheapestItem
            let totalApplicableItems
            if (discountRule.discount.type === "%") {
              if (discountRule.appliesTo === AppliesToEnum.CheapestItem) {
                cheapestItem = getPriceOfCheapestItem(applicableItems);
                discountAmount = Math.round((cheapestItem.price ?? 0) * (discountRule.discount.amount / 100) * -1);
                cheapestItem.discount = {amount: discountAmount, type: "$"};
                appliesTo.push(cheapestItem);

              } else if (discountRule.appliesTo === AppliesToEnum.TotalApplicableItems) {
                totalApplicableItems = GetTotalOfApplicableItems(applicableItems);
                discountAmount =
                    Math.round(totalApplicableItems * (discountRule.discount.amount / 100) * -1);

              } else if (discountRule.appliesTo === AppliesToEnum.TotalApplicableItemsOneSale) {
                totalApplicableItems = GetTotalOfApplicableItems(applicableItems);
                discountAmount =
                    Math.round(totalApplicableItems * (discountRule.discount.amount / 100) * -1);
              }
            } else {

              discountAmount = discountRule.discount.amount * -1;
              if (discountRule.appliesTo === AppliesToEnum.CheapestItem) {
                cheapestItem = GetPriceOfCheapestItem(applicableItems);
                cheapestItem.discount = {amount: discountAmount, type: "$"};
                appliesTo.push(cheapestItem);

              } else if (discountRule.appliesTo === AppliesToEnum.TotalApplicableItems) {
                discountAmount = (discountRule.discount.amount) * -1;
              } else if (discountRule.appliesTo === AppliesToEnum.TotalApplicableItemsOneSale) {
                discountAmount = (discountRule.discount.amount) * -1;
              }


            }

            invoiceItem =
                {
                  uid: uuidv4(),
                  type: "DISCOUNT",
                  name: discountRule.name,
                  applicableItems: applicableItems.map(ai => ai.item),
                  appliesTo: appliesTo,
                  comment: discountRule.name,
                  price: discountAmount,
                  appliedDiscount:
                      {
                        id: discountRule.id,
                        name: discountRule.name,
                        discount: discountRule.discount,
                        appliedTo: "" + discountRule.appliesTo
                      }
                  ,
                  isCreatedByRule: true,
                  quantity: 1,
                  position: position
                };

            discounts.push(invoiceItem);


            applicableItems.forEach(ai => ai.item.quantity -= ai.quantity);
            applicableItems = {};
            i = -1;

            discountRule.rules.forEach(r => r.currentCount = 0);

            // ver caso de prueba  DiscountRulesTestCase.TestProduct1AndThen2 where we have line 1 with 1 producto and line 2 with 2 product.
            if (leftOver > 0) {
              productRule.currentCount = leftOver;
              applicableItems.push(
                  {
                    item: item,
                    quantity: leftOver
                  }
              );
            }

            break;
          }


        }
      }

      position++;
    }


    discountRule.rules.forEach(r => r.currentCount = 0);
    return discounts;
  }

  async analyze(saleContext, discountRuleId, domainId){
    const discountRule = await this.discountRuleService.findDiscount(discountRuleId, domainId)
    return await this.getDiscounts(saleContext, discountRule, domainId)
  }

}

module.exports = CartService;