
const ordersService = {
  getTotal: orders => {

    let total = 0;
    for(var item of orders.items){
      total += item.quantity * item.unitPrice
    }

    return total
  }
}

module.exports = ordersService;