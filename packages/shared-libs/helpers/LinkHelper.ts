import {WebContentSubtype, WebContentType} from "../models/index.js";


function formatLink(str:any) {
    if (str == null)
        return '';

    str = str.trim().toLowerCase()
        .replace('/', ' ')
        .replace('&', 'y')
        .replace(',', ' ')
        .replace('á', 'a')
        .replace('é', 'e')
        .replace('í', 'i')
        .replace('ó', 'o')
        .replace('ú', 'u')
        .replace('ñ', 'n')
        .replace("'", "")
        .replace("mx-enduro", "motocross");

    str = str.replace(/\s+/g, " ").replace(/ /g, "-");
    str = str.replace(/[^\w.\- ]/g, "");

    return str.length > 255 ? str.substring(0, 254) : str;
}

function startsWithNumbersAndHyphen2(text: any) {
    if (!text) return false;
    return /^\d+-/.test(text);
}


export const getUrl= (product: any) => {
    if(product.domainId === 1){
        return "/motocicleta/" + formatLink(product.linkName);
    }
    return formatLink(product.linkName);
}

export const getCategoryUrl =  (category: any) =>  {
    let prefix = "/";

    if (category.linkName && category.linkName.length > 0) {
        return prefix + formatLink(category.linkName);
    }

    return prefix + formatLink(category.name);
}

export const getProductUrl= (product: any) => {
    if (product.linkName && startsWithNumbersAndHyphen2(product.linkName)) {
        return "/motocicleta/" + product.linkName
    }

    return "/motocicleta/" + product.id + "-" + product.linkName
}

export const getWccUrl= (wcc:any ) => {

    if (wcc.subtype === WebContentSubtype.BlogEntry && wcc.domainId === 1)
        return "moto-blog/" + formatLink(wcc.name);


    if (wcc.type === WebContentType.Page && wcc.subtype === WebContentSubtype.ContentPage) {
        return formatLink(wcc.name)
    }

    return formatLink(wcc.name)
}