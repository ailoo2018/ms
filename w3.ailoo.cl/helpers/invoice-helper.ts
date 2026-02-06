
export  const invoiceHelper = {
  getTotal: invoice => {

    let total = 0;
    for(var item of invoice.items){
      total += item.quantity * item.amount
    }

    return total
  }
}

