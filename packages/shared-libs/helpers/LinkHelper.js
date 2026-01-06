

function getDepartment()
{
    var department = "motocicleta";
    if (AilooGlobal.Instance.Context != null
        && AilooGlobal.Instance.Context.WebSite != null
        && bici.Any(w => w == AilooGlobal.Instance.Context.WebSite.Id))
    {
        department = "bicicleta";
    }

    return department;
}

function formatLink(str) {
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

module.exports.getUrl=function(product){
    if(product.domainId === 1){
        return "/motocicleta/" + formatLink(product.linkName);
    }
    return formatLink(product.linkName);
}